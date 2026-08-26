import { Inject, Injectable } from '@nestjs/common';
import { Interface } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { CURRENT_LOCK, EIP_7702_CODE_PREFIX, LEGACY_LOCK, LockContract, NFTFI_TOKEN_ADDRESS } from '../constants';
import { WalletKind } from '../types';
import tokenLockAbi from '../abis/token-lock.abi.json';
import distributorTokenLockAbi from '../abis/distributor-token-lock.abi.json';
import nftfiTokenAbi from '../abis/nftfi-token.abi.json';
import { RPC_PROVIDER } from './provider.token';

/** Max `eth_call` / `eth_getCode` requests in flight at once, so a few thousand reads do not flood the RPC. */
const READ_CONCURRENCY = 20;

interface ViewCall {
  readonly target: string;
  readonly callData: string;
}

/**
 * Typed, block-pinned reads against the two lock contracts and the NFTFI token. Every read is a direct
 * `eth_call` pinned to the generation block; the per-wallet/per-request reads are issued with a bounded
 * concurrency so the thousands of legacy-request lookups do not overwhelm the RPC endpoint.
 *
 * `from`-override simulations live in `SimulationService`, not here.
 */
@Injectable()
export class LockReaderService {
  private readonly currentLock: Contract;
  private readonly legacyLock: Contract;
  private readonly nftfiToken: Contract;
  private readonly tokenLockInterface = new Interface(tokenLockAbi);
  private readonly distributorInterface = new Interface(distributorTokenLockAbi);

  constructor(@Inject(RPC_PROVIDER) private readonly provider: StaticJsonRpcProvider) {
    this.currentLock = new Contract(CURRENT_LOCK.address, tokenLockAbi, provider);
    this.legacyLock = new Contract(LEGACY_LOCK.address, distributorTokenLockAbi, provider);
    this.nftfiToken = new Contract(NFTFI_TOKEN_ADDRESS, nftfiTokenAbi, provider);
  }

  async getLatestBlock(): Promise<number> {
    return this.provider.getBlockNumber();
  }

  /** Unix timestamp (seconds) of the pinned block — the `block.timestamp` cooldown checks compare against. */
  async getBlockTimestamp(block: number): Promise<number> {
    const { timestamp } = await this.provider.getBlock(block);
    return timestamp;
  }

  private lockInterface(lock: LockContract): Interface {
    return lock.kind === CURRENT_LOCK.kind ? this.tokenLockInterface : this.distributorInterface;
  }

  private lockContract(lock: LockContract): Contract {
    return lock.kind === CURRENT_LOCK.kind ? this.currentLock : this.legacyLock;
  }

  async isPaused(lock: LockContract, block: number): Promise<boolean> {
    return this.lockContract(lock).paused({ blockTag: block });
  }

  async getCooldown(lock: LockContract, block: number): Promise<BigNumber> {
    return this.lockContract(lock).cooldown({ blockTag: block });
  }

  async getProtocolSignerAddress(lock: LockContract, block: number): Promise<string> {
    return this.lockContract(lock).protocolSignerAddress({ blockTag: block });
  }

  async getNftfiBalanceOf(address: string, block: number): Promise<BigNumber> {
    return this.nftfiToken.balanceOf(address, { blockTag: block });
  }

  /** `lockedTokens(wallet)` for every wallet. Returned map is keyed by lower-cased wallet. */
  async getLockedTokens(
    lock: LockContract,
    wallets: readonly string[],
    block: number
  ): Promise<Map<string, BigNumber>> {
    return this.batchUint256(lock, 'lockedTokens', wallets, block);
  }

  /** `withdrawalRequestAmounts(wallet)` for every wallet. */
  async getWithdrawalRequestAmounts(
    lock: LockContract,
    wallets: readonly string[],
    block: number
  ): Promise<Map<string, BigNumber>> {
    return this.batchUint256(lock, 'withdrawalRequestAmounts', wallets, block);
  }

  /** `withdrawRequests(hash)` for every request hash. Returned map is keyed by hash. */
  async getWithdrawRequests(
    lock: LockContract,
    hashes: readonly string[],
    block: number
  ): Promise<Map<string, boolean>> {
    const iface = this.lockInterface(lock);
    const calls = hashes.map(hash => ({
      target: lock.address,
      callData: iface.encodeFunctionData('withdrawRequests', [hash])
    }));
    const results = await this.aggregate(calls, block);
    const map = new Map<string, boolean>();
    hashes.forEach((hash, i) => {
      map.set(hash, iface.decodeFunctionResult('withdrawRequests', results[i])[0] as boolean);
    });
    return map;
  }

  /** Classifies every wallet by its on-chain code at the pinned block, capped at a safe concurrency. */
  async classifyWallets(wallets: readonly string[], block: number): Promise<Map<string, WalletKind>> {
    const kinds = await this.mapWithConcurrency(wallets, wallet => this.classifyWallet(wallet, block));
    return new Map(wallets.map((wallet, i) => [wallet.toLowerCase(), kinds[i]]));
  }

  private async classifyWallet(wallet: string, block: number): Promise<WalletKind> {
    const code = (await this.provider.getCode(wallet, block)).toLowerCase();
    if (code === '0x' || code === '') return WalletKind.Eoa;
    if (code.startsWith(EIP_7702_CODE_PREFIX)) return WalletKind.Eip7702;
    return WalletKind.Contract;
  }

  private async batchUint256(
    lock: LockContract,
    fn: string,
    wallets: readonly string[],
    block: number
  ): Promise<Map<string, BigNumber>> {
    const iface = this.lockInterface(lock);
    const calls = wallets.map(wallet => ({
      target: lock.address,
      callData: iface.encodeFunctionData(fn, [wallet])
    }));
    const results = await this.aggregate(calls, block);
    const map = new Map<string, BigNumber>();
    wallets.forEach((wallet, i) => {
      map.set(wallet.toLowerCase(), iface.decodeFunctionResult(fn, results[i])[0] as BigNumber);
    });
    return map;
  }

  /** Issues each view call as a direct block-pinned `eth_call`, capped at `READ_CONCURRENCY` in flight. */
  private async aggregate(calls: readonly ViewCall[], block: number): Promise<string[]> {
    return this.mapWithConcurrency(calls, call => this.provider.call({ to: call.target, data: call.callData }, block));
  }

  /** Maps `fn` over `items` in fixed-size chunks so no more than `READ_CONCURRENCY` run concurrently. */
  private async mapWithConcurrency<T, R>(items: readonly T[], fn: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = [];
    for (let i = 0; i < items.length; i += READ_CONCURRENCY) {
      const chunk = items.slice(i, i + READ_CONCURRENCY);
      results.push(...(await Promise.all(chunk.map(fn))));
    }
    return results;
  }
}
