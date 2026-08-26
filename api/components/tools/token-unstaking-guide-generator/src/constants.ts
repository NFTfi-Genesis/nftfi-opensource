/**
 * Registry of the NFTFI token-lock contracts this generator reads, plus the on-chain anchors the
 * run depends on. Addresses, ABIs, and deploy blocks mirror the verified `eth.token` mainnet
 * deployment artifacts (`deployments/mainnet/*.json`, branch `dev`); keep them in sync if redeployed.
 *
 * Only addresses/ABIs/deploy-blocks are hard-coded here — every balance, request, and status is read
 * live from mainnet at the pinned generation block (see the task spec's "Data Freshness").
 */

export const NFTFI_DECIMALS = 18;

/** NFTFI ERC-20 token — used to read each lock contract's live balance for reconciliation. */
export const NFTFI_TOKEN_ADDRESS = '0x09D6F0F5A21f5BE4f59e209747E2d07F50BC694C';

export enum LockKind {
  /** Current combined lock — `withdrawNoCooldown(_amount)`, no cooldown, no requests. */
  Current = 'current',
  /** Legacy distributor lock — `withdraw(_amount, _requestTimestamp, 0, 0x)`, 41-day cooldown. */
  Legacy = 'legacy'
}

export interface LockContract {
  readonly kind: LockKind;
  /** Checksummed lock contract address. */
  readonly address: string;
  /** Block the contract was deployed at — the lower bound for event log queries. */
  readonly deployBlock: number;
  /** Exact Etherscan write-function a holder calls to withdraw. */
  readonly withdrawFunction: string;
}

export const CURRENT_LOCK: LockContract = {
  kind: LockKind.Current,
  address: '0x8a63B7D2B66FB054705731Cc7964b05e7Ad095cF',
  deployBlock: 20032734,
  withdrawFunction: 'withdrawNoCooldown'
};

export const LEGACY_LOCK: LockContract = {
  kind: LockKind.Legacy,
  address: '0xe53FfaCaDbc4744bE405BAD4AbE9852348eBeC02',
  deployBlock: 19588242,
  withdrawFunction: 'withdraw'
};

/**
 * Third lock contract. Out of scope while empty: the run only confirms its NFTFI balance is still 0
 * as a preflight invariant and aborts if not — it does not build a withdrawal path for it.
 */
export const EXTERNAL_LOCK_ADDRESS = '0x55c145F80Bd932E4d787f28327Da41d7C3DFb1F7';

/** Block range per `eth_getLogs` request when scanning a lock's full history. */
export const LOG_QUERY_CHUNK_SIZE = 50_000;

/** EIP-7702 delegation marker — code starting with these bytes is a delegated EOA, not a contract. */
export const EIP_7702_CODE_PREFIX = '0xef01';
