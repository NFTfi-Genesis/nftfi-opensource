import { LockKind } from './constants';

/** How a wallet's on-chain code classifies it. Affects the developer report only, never the row. */
export enum WalletKind {
  /** No code (`0x`) — a plain externally-owned account. */
  Eoa = 'eoa',
  /** Code starts with `0xef01` — an EIP-7702 delegated EOA. Treated exactly like an EOA. */
  Eip7702 = 'eip7702',
  /** Any other non-empty code — a genuine contract wallet (Safe / multisig). Flagged for the team. */
  Contract = 'contract'
}

/** A single `name = value` parameter the user copies into the matching Etherscan input box. */
export interface RowParameter {
  readonly name: string;
  readonly value: string;
}

/**
 * One published, simulated withdrawal — one row of the public file and one Etherscan transaction.
 * Carries no contract jargon; `lockAddress` only feeds the Etherscan link whose visible text is the
 * address itself.
 */
export interface ActionRow {
  readonly wallet: string;
  /** Raw NFTFI amount in wei (18 decimals) the row withdraws. */
  readonly amountRaw: string;
  /** Same amount, human-readable, for the public `Amount` column. */
  readonly amountHuman: string;
  /** Lock contract the row targets — used to build the Etherscan link, not shown as a column. */
  readonly lockAddress: string;
  /** Exact Etherscan function name to open. */
  readonly functionName: string;
  /** Parameters in ABI order, each entered into its own Etherscan input box. */
  readonly parameters: readonly RowParameter[];
}

/** The legacy `(amount, timestamp)` request tuple, surfaced in the developer report for context. */
export interface RequestTuple {
  readonly amountRaw: string;
  readonly requestTimestamp: number;
}

/**
 * A wallet/transaction the run could not turn into a trustworthy public row. Errors block publishing
 * (see Publish Gate) — every locked token must end up in a row or an error, never silently dropped.
 */
export interface ReportError {
  readonly wallet: string;
  /** Address of the lock contract this entry concerns. */
  readonly lockAddress: string;
  readonly amountRaw: string;
  readonly amountHuman: string;
  /** Present for legacy requests; absent for current-lock balances. */
  readonly request?: RequestTuple;
  /** Concrete cause — a decoded revert string, a failed reconciliation, etc. */
  readonly reason: string;
}

/** Informational note the team should be aware of, but which does NOT block publishing. */
export interface ReportFlag {
  readonly wallet: string;
  /** Address of the lock contract this entry concerns. */
  readonly lockAddress: string;
  readonly amountRaw: string;
  readonly amountHuman: string;
  readonly reason: string;
}

/** One reconciliation/trust check and whether it held at the generation block. */
export interface ReconciliationCheck {
  readonly name: string;
  readonly passed: boolean;
  readonly detail: string;
  /**
   * Per-wallet checks are collapsed in the report (only failures are listed, the rest become a
   * `N/N reconciled` summary line); global trust checks render unconditionally.
   */
  readonly perWallet?: boolean;
}

/** Headline figures for the developer report's run summary. */
export interface RunSummary {
  readonly generatedAt: Date;
  readonly block: number;
  readonly totalWallets: number;
  readonly totalRowCount: number;
  readonly totalRawListed: string;
  readonly totalHumanListed: string;
  readonly errorCount: number;
  readonly flagCount: number;
}

/** Everything one run produces — the inputs to both Markdown files and the Publish Gate. */
export interface UnstakingReport {
  readonly rows: readonly ActionRow[];
  readonly errors: readonly ReportError[];
  readonly flags: readonly ReportFlag[];
  readonly reconciliation: readonly ReconciliationCheck[];
  readonly summary: RunSummary;
}

/** A balance discovered on a lock, paired with how its wallet's code classifies it. */
export interface ClassifiedBalance {
  readonly wallet: string;
  readonly kind: WalletKind;
  readonly lockKind: LockKind;
}
