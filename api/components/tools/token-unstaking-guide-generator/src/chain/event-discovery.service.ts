import { Inject, Injectable, Logger } from '@nestjs/common';
import { BigNumber } from '@ethersproject/bignumber';
import { Contract, Event } from '@ethersproject/contracts';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { CURRENT_LOCK, LEGACY_LOCK, LOG_QUERY_CHUNK_SIZE } from '../constants';
import tokenLockAbi from '../abis/token-lock.abi.json';
import distributorTokenLockAbi from '../abis/distributor-token-lock.abi.json';
import { RPC_PROVIDER } from './provider.token';

/** A `WithdrawalRequested` log reconstructed from the legacy lock — a candidate before verification. */
export interface LegacyRequestCandidate {
  readonly wallet: string;
  readonly amountRaw: string;
  readonly requestTimestamp: number;
  readonly blockNumber: number;
  readonly logIndex: number;
}

/**
 * Reconstructs affected wallets and legacy request candidates from event logs — neither lock exposes
 * an on-chain enumeration of holders, so the candidate set must come from logs and is then verified
 * against live contract state by `LockReaderService` / `SimulationService`.
 */
@Injectable()
export class EventDiscoveryService {
  private readonly logger = new Logger(EventDiscoveryService.name);
  private readonly currentLock: Contract;
  private readonly legacyLock: Contract;

  constructor(@Inject(RPC_PROVIDER) provider: StaticJsonRpcProvider) {
    this.currentLock = new Contract(CURRENT_LOCK.address, tokenLockAbi, provider);
    this.legacyLock = new Contract(LEGACY_LOCK.address, distributorTokenLockAbi, provider);
  }

  /** Distinct wallets that ever locked into the current `TokenLock`, lower-cased. */
  async findCurrentLockWallets(block: number): Promise<string[]> {
    const events = await this.queryChunked(this.currentLock, 'Locked', CURRENT_LOCK.deployBlock, block);
    const wallets = new Set<string>();
    for (const event of events) wallets.add((event.args?._user as string).toLowerCase());
    this.logger.log(`Discovered ${wallets.size} current-lock wallets from ${events.length} Locked events`);
    return [...wallets];
  }

  /**
   * Preflight count of `WithdrawalRequested` events ever emitted by the current `TokenLock`. The spec
   * invariant requires this to be 0; a non-zero count aborts the run.
   */
  async countCurrentWithdrawalRequests(block: number): Promise<number> {
    const events = await this.queryChunked(this.currentLock, 'WithdrawalRequested', CURRENT_LOCK.deployBlock, block);
    return events.length;
  }

  /** All `WithdrawalRequested` logs on the legacy lock, decoded into request tuples. */
  async findLegacyRequestCandidates(block: number): Promise<LegacyRequestCandidate[]> {
    const events = await this.queryChunked(this.legacyLock, 'WithdrawalRequested', LEGACY_LOCK.deployBlock, block);
    const candidates = events.map(event => ({
      wallet: (event.args?._user as string).toLowerCase(),
      amountRaw: (event.args?._amount as BigNumber).toString(),
      requestTimestamp: (event.args?._timestamp as BigNumber).toNumber(),
      blockNumber: event.blockNumber,
      logIndex: event.logIndex
    }));
    this.logger.log(`Discovered ${candidates.length} legacy WithdrawalRequested candidates`);
    return candidates;
  }

  private async queryChunked(
    contract: Contract,
    eventName: string,
    fromBlock: number,
    toBlock: number
  ): Promise<Event[]> {
    const filter = contract.filters[eventName]();
    const all: Event[] = [];
    for (let start = fromBlock; start <= toBlock; start += LOG_QUERY_CHUNK_SIZE) {
      const end = Math.min(start + LOG_QUERY_CHUNK_SIZE - 1, toBlock);
      const chunk = await contract.queryFilter(filter, start, end);
      all.push(...chunk);
    }
    return all;
  }
}
