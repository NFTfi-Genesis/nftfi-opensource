import { BigNumber } from '@ethersproject/bignumber';
import { CURRENT_LOCK, EXTERNAL_LOCK_ADDRESS, LEGACY_LOCK, LockContract, LockKind } from '../src/constants';
import { LockReaderService } from '../src/chain/lock-reader.service';
import { EventDiscoveryService, LegacyRequestCandidate } from '../src/chain/event-discovery.service';
import { SimulationService, SimulationResult } from '../src/chain/simulation.service';
import { computeRequestHash } from '../src/chain/request-hash';
import { PreflightInvariantError, UnstakingReportService } from '../src/unstaking-report.service';
import { WalletKind } from '../src/types';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const WALLET_A = '0x1111111111111111111111111111111111111111';
const WALLET_B = '0x2222222222222222222222222222222222222222';
const LEGACY_COOLDOWN = 3542400;
const REQUEST_TS = 1700000000;
const BLOCK = 25345421;

interface Scenario {
  currentPaused: boolean;
  currentCooldown: string;
  legacyPaused: boolean;
  legacySigner: string;
  externalBalance: string;
  currentRequestCount: number;
  currentWallets: string[];
  currentLocked: Record<string, string>;
  currentBalance: string;
  legacyCandidates: LegacyRequestCandidate[];
  activeHashes: Set<string>;
  legacyLocked: Record<string, string>;
  legacyReqAmounts: Record<string, string>;
  legacyBalance: string;
  blockTimestamp: number;
  walletKinds: Record<string, WalletKind>;
  currentSim: Record<string, SimulationResult>;
  legacySim: Record<string, SimulationResult>;
}

const toMap = (record: Record<string, string>, wallets: readonly string[]): Map<string, BigNumber> =>
  new Map(wallets.map(w => [w.toLowerCase(), BigNumber.from(record[w.toLowerCase()] ?? '0')]));

const isCurrent = (lock: LockContract): boolean => lock.kind === LockKind.Current;

const buildMocks = (scenario: Scenario): { service: UnstakingReportService; sim: SimulationService } => {
  const reader = {
    isPaused: jest.fn(async (lock: LockContract) => (isCurrent(lock) ? scenario.currentPaused : scenario.legacyPaused)),
    getCooldown: jest.fn(async (lock: LockContract) =>
      BigNumber.from(isCurrent(lock) ? scenario.currentCooldown : String(LEGACY_COOLDOWN))
    ),
    getProtocolSignerAddress: jest.fn(async () => scenario.legacySigner),
    getNftfiBalanceOf: jest.fn(async (address: string) => {
      if (address === CURRENT_LOCK.address) return BigNumber.from(scenario.currentBalance);
      if (address === LEGACY_LOCK.address) return BigNumber.from(scenario.legacyBalance);
      if (address === EXTERNAL_LOCK_ADDRESS) return BigNumber.from(scenario.externalBalance);
      return BigNumber.from('0');
    }),
    getBlockTimestamp: jest.fn(async () => scenario.blockTimestamp),
    getLockedTokens: jest.fn(async (lock: LockContract, wallets: readonly string[]) =>
      toMap(isCurrent(lock) ? scenario.currentLocked : scenario.legacyLocked, wallets)
    ),
    getWithdrawalRequestAmounts: jest.fn(async (_lock: LockContract, wallets: readonly string[]) =>
      toMap(scenario.legacyReqAmounts, wallets)
    ),
    getWithdrawRequests: jest.fn(
      async (_lock: LockContract, hashes: readonly string[]) =>
        new Map(hashes.map(h => [h, scenario.activeHashes.has(h)]))
    ),
    classifyWallets: jest.fn(
      async (wallets: readonly string[]) =>
        new Map(wallets.map(w => [w.toLowerCase(), scenario.walletKinds[w.toLowerCase()] ?? WalletKind.Eoa]))
    )
  };

  const discovery = {
    findCurrentLockWallets: jest.fn(async () => [...scenario.currentWallets]),
    countCurrentWithdrawalRequests: jest.fn(async () => scenario.currentRequestCount),
    findLegacyRequestCandidates: jest.fn(async () => [...scenario.legacyCandidates])
  };

  const sim = {
    simulateCurrentWithdraw: jest.fn(
      async (wallet: string) => scenario.currentSim[wallet.toLowerCase()] ?? { ok: true }
    ),
    simulateLegacyWithdraw: jest.fn(async (wallet: string) => scenario.legacySim[wallet.toLowerCase()] ?? { ok: true })
  };

  const service = new UnstakingReportService(
    reader as unknown as LockReaderService,
    discovery as unknown as EventDiscoveryService,
    sim as unknown as SimulationService
  );
  return { service, sim: sim as unknown as SimulationService };
};

const legacyRequest = (wallet: string, amountRaw: string, ts: number): LegacyRequestCandidate => ({
  wallet,
  amountRaw,
  requestTimestamp: ts,
  blockNumber: 19600000,
  logIndex: 0
});

const baseScenario = (overrides: Partial<Scenario> = {}): Scenario => {
  const candidate = legacyRequest(WALLET_B, '500', REQUEST_TS);
  return {
    currentPaused: false,
    currentCooldown: '0',
    legacyPaused: false,
    legacySigner: ZERO_ADDRESS,
    externalBalance: '0',
    currentRequestCount: 0,
    currentWallets: [WALLET_A],
    currentLocked: { [WALLET_A]: '1000' },
    currentBalance: '1000',
    legacyCandidates: [candidate],
    activeHashes: new Set([computeRequestHash('500', WALLET_B, REQUEST_TS)]),
    legacyLocked: { [WALLET_B]: '500' },
    legacyReqAmounts: { [WALLET_B]: '500' },
    legacyBalance: '500',
    blockTimestamp: REQUEST_TS + LEGACY_COOLDOWN + 1,
    walletKinds: {},
    currentSim: {},
    legacySim: {},
    ...overrides
  };
};

const generatedAt = new Date('2026-06-25T00:00:00.000Z');

describe('UnstakingReportService', () => {
  beforeEach(() => jest.resetAllMocks());

  describe('preflight invariants', () => {
    it('aborts when the current lock is paused', async () => {
      const { service } = buildMocks(baseScenario({ currentPaused: true }));
      await expect(service.generate(BLOCK, generatedAt)).rejects.toBeInstanceOf(PreflightInvariantError);
    });

    it('aborts when the legacy protocol signer is set', async () => {
      const { service } = buildMocks(baseScenario({ legacySigner: '0x000000000000000000000000000000000000bEEF' }));
      await expect(service.generate(BLOCK, generatedAt)).rejects.toBeInstanceOf(PreflightInvariantError);
    });

    it('aborts when the current lock has any WithdrawalRequested events', async () => {
      const { service } = buildMocks(baseScenario({ currentRequestCount: 3 }));
      await expect(service.generate(BLOCK, generatedAt)).rejects.toBeInstanceOf(PreflightInvariantError);
    });

    it('aborts when ExternalTokenLock still holds NFTFI', async () => {
      const { service } = buildMocks(baseScenario({ externalBalance: '1' }));
      await expect(service.generate(BLOCK, generatedAt)).rejects.toBeInstanceOf(PreflightInvariantError);
    });
  });

  describe('happy path', () => {
    it('emits a full-balance current row and a per-request legacy row', async () => {
      const { service } = buildMocks(baseScenario());
      const report = await service.generate(BLOCK, generatedAt);

      expect(report.rows).toHaveLength(2);
      expect(report.errors).toHaveLength(0);
      expect(report.flags).toHaveLength(0);
      expect(report.reconciliation.every(c => c.passed)).toBe(true);

      const currentRow = report.rows.find(r => r.functionName === 'withdrawNoCooldown');
      expect(currentRow?.wallet).toBe('0x1111111111111111111111111111111111111111');
      expect(currentRow?.amountRaw).toBe('1000');
      expect(currentRow?.lockAddress).toBe('0x8a63B7D2B66FB054705731Cc7964b05e7Ad095cF');
      expect(currentRow?.parameters).toEqual([{ name: '_amount', value: '1000' }]);

      const legacyRow = report.rows.find(r => r.functionName === 'withdraw');
      expect(legacyRow?.wallet).toBe('0x2222222222222222222222222222222222222222');
      expect(legacyRow?.lockAddress).toBe('0xe53FfaCaDbc4744bE405BAD4AbE9852348eBeC02');
      expect(legacyRow?.parameters).toEqual([
        { name: '_amount', value: '500' },
        { name: '_requestTimestamp', value: '1700000000' },
        { name: '_protocolSignatureExpiry', value: '0' },
        { name: '_protocolSignature', value: '0x' }
      ]);
    });

    it('sorts rows by wallet address', async () => {
      const { service } = buildMocks(baseScenario());
      const report = await service.generate(BLOCK, generatedAt);
      expect(report.rows[0].wallet).toBe('0x1111111111111111111111111111111111111111');
      expect(report.rows[1].wallet).toBe('0x2222222222222222222222222222222222222222');
    });
  });

  describe('legacy cooldown', () => {
    it('records an error and emits no row when a request has not matured', async () => {
      const { service } = buildMocks(baseScenario({ blockTimestamp: REQUEST_TS + 1 }));
      const report = await service.generate(BLOCK, generatedAt);

      expect(report.rows.find(r => r.functionName === 'withdraw')).toBeUndefined();
      const error = report.errors.find(e => e.wallet === '0x2222222222222222222222222222222222222222');
      expect(error?.reason).toBe('Cooldown not up yet');
      expect(error?.request).toEqual({ amountRaw: '500', requestTimestamp: 1700000000 });
    });
  });

  describe('simulation gate', () => {
    it('records an error with the decoded revert reason instead of a public row', async () => {
      const { service } = buildMocks(
        baseScenario({ currentSim: { [WALLET_A]: { ok: false, revertReason: 'withdraw amount > total' } } })
      );
      const report = await service.generate(BLOCK, generatedAt);

      expect(report.rows.find(r => r.functionName === 'withdrawNoCooldown')).toBeUndefined();
      const error = report.errors.find(e => e.wallet === '0x1111111111111111111111111111111111111111');
      expect(error?.reason).toBe('withdraw amount > total');
    });

    it('skips legacy candidates whose request hash is not active on-chain', async () => {
      const { service } = buildMocks(baseScenario({ activeHashes: new Set() }));
      const report = await service.generate(BLOCK, generatedAt);
      expect(report.rows.find(r => r.functionName === 'withdraw')).toBeUndefined();
    });

    it('records a legacy error with the revert reason when its simulation fails', async () => {
      const { service } = buildMocks(
        baseScenario({ legacySim: { [WALLET_B]: { ok: false, revertReason: 'no request' } } })
      );
      const report = await service.generate(BLOCK, generatedAt);

      expect(report.rows.find(r => r.functionName === 'withdraw')).toBeUndefined();
      const error = report.errors.find(e => e.wallet === '0x2222222222222222222222222222222222222222');
      expect(error?.reason).toBe('no request');
      expect(error?.request).toEqual({ amountRaw: '500', requestTimestamp: 1700000000 });
    });
  });

  describe('contract wallets', () => {
    it('emits a normal public row and an informational flag for a Safe', async () => {
      const { service } = buildMocks(baseScenario({ walletKinds: { [WALLET_A]: WalletKind.Contract } }));
      const report = await service.generate(BLOCK, generatedAt);

      expect(report.rows.find(r => r.wallet === '0x1111111111111111111111111111111111111111')).toBeDefined();
      expect(report.flags).toHaveLength(1);
      expect(report.flags[0].wallet).toBe('0x1111111111111111111111111111111111111111');
      expect(report.flags[0].lockAddress).toBe('0x8a63B7D2B66FB054705731Cc7964b05e7Ad095cF');
    });

    it('does not flag an EIP-7702 delegated EOA', async () => {
      const { service } = buildMocks(baseScenario({ walletKinds: { [WALLET_A]: WalletKind.Eip7702 } }));
      const report = await service.generate(BLOCK, generatedAt);
      expect(report.flags).toHaveLength(0);
    });
  });

  describe('reconciliation', () => {
    it('fails the coverage/totals checks when a lock balance exceeds the sum of locked tokens', async () => {
      const { service } = buildMocks(baseScenario({ currentBalance: '2000' }));
      const report = await service.generate(BLOCK, generatedAt);
      expect(report.reconciliation.some(c => !c.passed)).toBe(true);
    });

    it('emits a per-wallet check only for wallets with a balance, skipping fully-withdrawn ones', async () => {
      const withdrawn = legacyRequest('0x3333333333333333333333333333333333333333', '900', 1700000001);
      const { service } = buildMocks(
        baseScenario({ legacyCandidates: [legacyRequest(WALLET_B, '500', REQUEST_TS), withdrawn] })
      );
      const report = await service.generate(BLOCK, generatedAt);

      const perWallet = report.reconciliation.filter(c => c.perWallet);
      expect(perWallet).toHaveLength(1);
      expect(perWallet[0].name).toContain('0x2222222222222222222222222222222222222222');
      expect(perWallet[0].name).not.toContain('0x3333333333333333333333333333333333333333');
    });
  });
});
