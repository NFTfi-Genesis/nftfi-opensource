import { Injectable, Logger } from '@nestjs/common';
import { BigNumber } from '@ethersproject/bignumber';
import { Zero } from '@ethersproject/constants';
import { CURRENT_LOCK, EXTERNAL_LOCK_ADDRESS, LEGACY_LOCK, LockContract } from './constants';
import { toHumanNftfi } from './format';
import { LockReaderService } from './chain/lock-reader.service';
import { EventDiscoveryService, LegacyRequestCandidate } from './chain/event-discovery.service';
import { SimulationService } from './chain/simulation.service';
import { computeRequestHash } from './chain/request-hash';
import { ActionRow, ReconciliationCheck, ReportError, ReportFlag, UnstakingReport, WalletKind } from './types';

/** Thrown when a preflight invariant differs from its expected value — the run aborts and escalates. */
export class PreflightInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PreflightInvariantError';
  }
}

const CONTRACT_WALLET_FLAG_REASON =
  'Contract wallet (Safe / multisig) — action row is valid but must be executed via the Safe, not Etherscan Connect to Web3';
const COOLDOWN_NOT_UP_REASON = 'Cooldown not up yet';

/**
 * Orchestrates one generation run: read preflight invariants once, reconstruct and verify every
 * withdrawable balance/request, run the Simulation Gate on each, then reconcile the totals. Produces
 * the structured `UnstakingReport` both Markdown files render from.
 */
@Injectable()
export class UnstakingReportService {
  private readonly logger = new Logger(UnstakingReportService.name);

  constructor(
    private readonly reader: LockReaderService,
    private readonly discovery: EventDiscoveryService,
    private readonly simulation: SimulationService
  ) {}

  async generate(block: number, generatedAt: Date): Promise<UnstakingReport> {
    await this.assertPreflightInvariants(block);

    // Discovery (full-history log sweeps) and balance reads happen exactly once here, then feed both
    // the row builders and the reconciliation — re-querying logs per phase would double the run cost.
    const currentWallets = await this.discovery.findCurrentLockWallets(block);
    const currentLocked = await this.reader.getLockedTokens(CURRENT_LOCK, currentWallets, block);
    const currentBalance = await this.reader.getNftfiBalanceOf(CURRENT_LOCK.address, block);

    const legacyCandidates = dedupeByHash(await this.discovery.findLegacyRequestCandidates(block));
    const legacyWallets = [...new Set(legacyCandidates.map(candidate => candidate.wallet))];
    const legacyLocked = await this.reader.getLockedTokens(LEGACY_LOCK, legacyWallets, block);
    const legacyReqAmounts = await this.reader.getWithdrawalRequestAmounts(LEGACY_LOCK, legacyWallets, block);
    const legacyBalance = await this.reader.getNftfiBalanceOf(LEGACY_LOCK.address, block);

    const current = await this.buildCurrentLockRows(block, currentWallets, currentLocked);
    const legacy = await this.buildLegacyLockRows(block, legacyCandidates);

    const rows = [...current.rows, ...legacy.rows];
    const errors = [...current.errors, ...legacy.errors];
    const flags = [...current.flags, ...legacy.flags];

    const sortedRows = [...rows].sort((a, b) => a.wallet.localeCompare(b.wallet));

    const reconciliation = this.reconcile({
      rows: sortedRows,
      errors,
      currentWallets,
      currentLocked,
      currentBalance,
      legacyWallets,
      legacyLocked,
      legacyReqAmounts,
      legacyBalance,
      legacyActiveByWallet: legacy.activeRequestAmountByWallet
    });

    const totalRawListed = sumRaw([...sortedRows.map(r => r.amountRaw), ...errors.map(e => e.amountRaw)]);
    const wallets = new Set([...sortedRows.map(r => r.wallet), ...errors.map(e => e.wallet)]);

    return {
      rows: sortedRows,
      errors,
      flags,
      reconciliation,
      summary: {
        generatedAt,
        block,
        totalWallets: wallets.size,
        totalRowCount: sortedRows.length,
        totalRawListed: totalRawListed.toString(),
        totalHumanListed: toHumanNftfi(totalRawListed),
        errorCount: errors.length,
        flagCount: flags.length
      }
    };
  }

  /** Reads the global invariants once; any mismatch aborts the whole run (see spec "Preflight Invariants"). */
  private async assertPreflightInvariants(block: number): Promise<void> {
    const [currentPaused, currentCooldown, legacyPaused, legacySigner, externalBalance, currentRequestCount] =
      await Promise.all([
        this.reader.isPaused(CURRENT_LOCK, block),
        this.reader.getCooldown(CURRENT_LOCK, block),
        this.reader.isPaused(LEGACY_LOCK, block),
        this.reader.getProtocolSignerAddress(LEGACY_LOCK, block),
        this.reader.getNftfiBalanceOf(EXTERNAL_LOCK_ADDRESS, block),
        this.discovery.countCurrentWithdrawalRequests(block)
      ]);

    const failures: string[] = [];
    if (currentPaused) failures.push('TokenLock.paused() == true (expected false)');
    if (!currentCooldown.isZero()) failures.push(`TokenLock.cooldown() == ${currentCooldown.toString()} (expected 0)`);
    if (legacyPaused) failures.push('DistributorTokenLock.paused() == true (expected false)');
    if (legacySigner !== '0x0000000000000000000000000000000000000000') {
      failures.push(`DistributorTokenLock.protocolSignerAddress() == ${legacySigner} (expected 0x0)`);
    }
    if (!externalBalance.isZero()) {
      failures.push(`ExternalTokenLock NFTFI balance == ${externalBalance.toString()} (expected 0)`);
    }
    if (currentRequestCount !== 0) {
      failures.push(`TokenLock WithdrawalRequested events == ${currentRequestCount} (expected 0)`);
    }

    if (failures.length > 0) {
      throw new PreflightInvariantError(
        `Preflight invariants failed at block ${block}; aborting and escalating to a human:\n - ${failures.join(
          '\n - '
        )}`
      );
    }
    this.logger.log(`Preflight invariants hold at block ${block}`);
  }

  /** Current `TokenLock`: one full-balance `withdrawNoCooldown` row per holder, gated by simulation. */
  private async buildCurrentLockRows(
    block: number,
    wallets: readonly string[],
    locked: ReadonlyMap<string, BigNumber>
  ): Promise<RowBuildResult> {
    const holders = wallets.filter(wallet => (locked.get(wallet) ?? Zero).gt(0));
    const kinds = await this.reader.classifyWallets(holders, block);

    const rows: ActionRow[] = [];
    const errors: ReportError[] = [];
    const flags: ReportFlag[] = [];

    for (const wallet of holders) {
      const amount = locked.get(wallet) as BigNumber;
      const simulated = await this.simulation.simulateCurrentWithdraw(wallet, amount, block);
      if (!simulated.ok) {
        errors.push(this.toError(wallet, CURRENT_LOCK, amount, simulated.revertReason ?? 'unknown revert'));
        continue;
      }
      rows.push({
        wallet,
        amountRaw: amount.toString(),
        amountHuman: toHumanNftfi(amount),
        lockAddress: CURRENT_LOCK.address,
        functionName: CURRENT_LOCK.withdrawFunction,
        parameters: [{ name: '_amount', value: amount.toString() }]
      });
      this.maybeFlagContractWallet(wallet, kinds, CURRENT_LOCK, amount, flags);
    }

    return { rows, errors, flags, activeRequestAmountByWallet: new Map() };
  }

  /** Legacy `DistributorTokenLock`: one `withdraw` row per active, cooldown-mature request. */
  private async buildLegacyLockRows(block: number, candidates: readonly HashedCandidate[]): Promise<RowBuildResult> {
    const blockTimestamp = await this.reader.getBlockTimestamp(block);
    const cooldown = (await this.reader.getCooldown(LEGACY_LOCK, block)).toNumber();

    const hashes = candidates.map(candidate => candidate.hash);
    const active = await this.reader.getWithdrawRequests(LEGACY_LOCK, hashes, block);
    const liveCandidates = candidates.filter(candidate => active.get(candidate.hash) === true);

    const wallets = [...new Set(liveCandidates.map(candidate => candidate.wallet))];
    const kinds = await this.reader.classifyWallets(wallets, block);

    const rows: ActionRow[] = [];
    const errors: ReportError[] = [];
    const flags: ReportFlag[] = [];
    const activeRequestAmountByWallet = new Map<string, BigNumber>();

    for (const candidate of liveCandidates) {
      const amount = BigNumber.from(candidate.amountRaw);
      addToWalletSum(activeRequestAmountByWallet, candidate.wallet, amount);

      if (blockTimestamp < candidate.requestTimestamp + cooldown) {
        errors.push(this.toError(candidate.wallet, LEGACY_LOCK, amount, COOLDOWN_NOT_UP_REASON, candidate));
        continue;
      }

      const simulated = await this.simulation.simulateLegacyWithdraw(
        candidate.wallet,
        amount,
        candidate.requestTimestamp,
        block
      );
      if (!simulated.ok) {
        errors.push(
          this.toError(candidate.wallet, LEGACY_LOCK, amount, simulated.revertReason ?? 'unknown revert', candidate)
        );
        continue;
      }

      rows.push({
        wallet: candidate.wallet,
        amountRaw: amount.toString(),
        amountHuman: toHumanNftfi(amount),
        lockAddress: LEGACY_LOCK.address,
        functionName: LEGACY_LOCK.withdrawFunction,
        parameters: [
          { name: '_amount', value: amount.toString() },
          { name: '_requestTimestamp', value: candidate.requestTimestamp.toString() },
          { name: '_protocolSignatureExpiry', value: '0' },
          { name: '_protocolSignature', value: '0x' }
        ]
      });
      this.maybeFlagContractWallet(candidate.wallet, kinds, LEGACY_LOCK, amount, flags);
    }

    return { rows, errors, flags, activeRequestAmountByWallet };
  }

  /** Runs the Reconciliation & Trust Checks — every locked token must land in a row or an error. */
  private reconcile(context: ReconciliationContext): ReconciliationCheck[] {
    const {
      rows,
      errors,
      currentWallets,
      currentLocked,
      currentBalance,
      legacyWallets,
      legacyLocked,
      legacyReqAmounts,
      legacyBalance,
      legacyActiveByWallet
    } = context;
    const checks: ReconciliationCheck[] = [];

    const currentSum = sumRaw([...currentLocked.values()].map(v => v.toString()));
    checks.push(
      equalityCheck(`Aggregate current: Σ lockedTokens == ${CURRENT_LOCK.address} balance`, currentSum, currentBalance)
    );

    const legacyActiveSum = sumRaw([...legacyActiveByWallet.values()].map(v => v.toString()));
    const legacyLockedSum = sumRaw([...legacyLocked.values()].map(v => v.toString()));
    checks.push(
      equalityCheck('Aggregate legacy: Σ active requests == Σ lockedTokens', legacyActiveSum, legacyLockedSum)
    );
    checks.push(
      equalityCheck(
        `Aggregate legacy: Σ lockedTokens == ${LEGACY_LOCK.address} balance`,
        legacyLockedSum,
        legacyBalance
      )
    );

    for (const wallet of legacyWallets) {
      const active = legacyActiveByWallet.get(wallet) ?? Zero;
      const locked = legacyLocked.get(wallet) ?? Zero;
      const reqAmount = legacyReqAmounts.get(wallet) ?? Zero;
      // Fully-withdrawn historical wallets reconcile as a vacuous 0 == 0 == 0; skip them so the
      // report only carries per-wallet checks that assert something real.
      if (active.isZero() && locked.isZero() && reqAmount.isZero()) continue;
      checks.push({
        ...equalityCheck(
          `Per-wallet legacy ${wallet}: Σ active requests == withdrawalRequestAmounts == lockedTokens`,
          active,
          locked,
          reqAmount
        ),
        perWallet: true
      });
    }

    const listedWallets = new Set([...rows.map(r => r.wallet), ...errors.map(e => e.wallet)]);
    const missingCurrent = currentWallets.filter(w => (currentLocked.get(w) ?? Zero).gt(0) && !listedWallets.has(w));
    const missingLegacy = legacyWallets.filter(w => (legacyLocked.get(w) ?? Zero).gt(0) && !listedWallets.has(w));
    checks.push({
      name: 'Coverage: every positive-balance wallet appears in a row or an error',
      passed: missingCurrent.length === 0 && missingLegacy.length === 0,
      detail:
        missingCurrent.length === 0 && missingLegacy.length === 0
          ? 'all positive-balance wallets accounted for'
          : `missing: ${[...missingCurrent, ...missingLegacy].join(', ')}`
    });

    const listedTotal = sumRaw([...rows.map(r => r.amountRaw), ...errors.map(e => e.amountRaw)]);
    checks.push(
      equalityCheck(
        `Totals tie out: Σ rows + Σ errors == ${CURRENT_LOCK.address} + ${LEGACY_LOCK.address} balance`,
        listedTotal,
        currentBalance.add(legacyBalance)
      )
    );

    return checks;
  }

  private maybeFlagContractWallet(
    wallet: string,
    kinds: ReadonlyMap<string, WalletKind>,
    lock: LockContract,
    amount: BigNumber,
    flags: ReportFlag[]
  ): void {
    if (kinds.get(wallet) === WalletKind.Contract) {
      flags.push({
        wallet,
        lockAddress: lock.address,
        amountRaw: amount.toString(),
        amountHuman: toHumanNftfi(amount),
        reason: CONTRACT_WALLET_FLAG_REASON
      });
    }
  }

  private toError(
    wallet: string,
    lock: LockContract,
    amount: BigNumber,
    reason: string,
    candidate?: LegacyRequestCandidate
  ): ReportError {
    return {
      wallet,
      lockAddress: lock.address,
      amountRaw: amount.toString(),
      amountHuman: toHumanNftfi(amount),
      reason,
      ...(candidate
        ? { request: { amountRaw: candidate.amountRaw, requestTimestamp: candidate.requestTimestamp } }
        : {})
    };
  }
}

interface ReconciliationContext {
  readonly rows: readonly ActionRow[];
  readonly errors: readonly ReportError[];
  readonly currentWallets: readonly string[];
  readonly currentLocked: ReadonlyMap<string, BigNumber>;
  readonly currentBalance: BigNumber;
  readonly legacyWallets: readonly string[];
  readonly legacyLocked: ReadonlyMap<string, BigNumber>;
  readonly legacyReqAmounts: ReadonlyMap<string, BigNumber>;
  readonly legacyBalance: BigNumber;
  readonly legacyActiveByWallet: ReadonlyMap<string, BigNumber>;
}

interface RowBuildResult {
  readonly rows: ActionRow[];
  readonly errors: ReportError[];
  readonly flags: ReportFlag[];
  /** Sum of active legacy request amounts per wallet, for per-wallet reconciliation (current lock: empty). */
  readonly activeRequestAmountByWallet: Map<string, BigNumber>;
}

interface HashedCandidate extends LegacyRequestCandidate {
  readonly hash: string;
}

/** One hash == one on-chain request; dedupe so duplicate logs never produce two rows for one request. */
const dedupeByHash = (candidates: readonly LegacyRequestCandidate[]): HashedCandidate[] => {
  const seen = new Map<string, HashedCandidate>();
  for (const candidate of candidates) {
    const hash = computeRequestHash(candidate.amountRaw, candidate.wallet, candidate.requestTimestamp);
    if (!seen.has(hash)) seen.set(hash, { ...candidate, hash });
  }
  return [...seen.values()];
};

const addToWalletSum = (map: Map<string, BigNumber>, wallet: string, amount: BigNumber): void => {
  map.set(wallet, (map.get(wallet) ?? Zero).add(amount));
};

const sumRaw = (amounts: readonly string[]): BigNumber =>
  amounts.reduce<BigNumber>((sum, amount) => sum.add(amount), Zero);

/** A reconciliation check that passes only when all supplied amounts are equal. */
const equalityCheck = (name: string, ...amounts: readonly BigNumber[]): ReconciliationCheck => {
  const passed = amounts.every(amount => amount.eq(amounts[0]));
  return { name, passed, detail: amounts.map(a => a.toString()).join(' == ') };
};
