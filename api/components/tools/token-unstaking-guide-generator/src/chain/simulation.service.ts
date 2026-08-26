import { Inject, Injectable } from '@nestjs/common';
import { defaultAbiCoder, Interface } from '@ethersproject/abi';
import { BigNumberish } from '@ethersproject/bignumber';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { CURRENT_LOCK, LEGACY_LOCK } from '../constants';
import tokenLockAbi from '../abis/token-lock.abi.json';
import distributorTokenLockAbi from '../abis/distributor-token-lock.abi.json';
import { RPC_PROVIDER } from './provider.token';

/** Outcome of one Simulation Gate run: success means the real transaction would succeed at this block. */
export interface SimulationResult {
  readonly ok: boolean;
  /** Decoded revert string when `ok` is false — becomes the developer-report error reason. */
  readonly revertReason?: string;
}

const ERROR_STRING_SELECTOR = '0x08c379a0';

/**
 * Runs the Simulation Gate: an `eth_call` of the row's exact calldata with `from` = the wallet,
 * pinned to the generation block. `eth_call` executes in the EVM with `msg.sender = from` but no
 * signature, gas, or on-chain transaction — a success proves a correctly-followed row will succeed.
 *
 * Each simulation needs its own `from` override, so they run as individual `provider.call`s.
 */
@Injectable()
export class SimulationService {
  private readonly tokenLockInterface = new Interface(tokenLockAbi);
  private readonly distributorInterface = new Interface(distributorTokenLockAbi);

  constructor(@Inject(RPC_PROVIDER) private readonly provider: StaticJsonRpcProvider) {}

  /** Simulates `withdrawNoCooldown(_amount)` on the current lock from the wallet. */
  async simulateCurrentWithdraw(wallet: string, amountRaw: BigNumberish, block: number): Promise<SimulationResult> {
    const data = this.tokenLockInterface.encodeFunctionData(CURRENT_LOCK.withdrawFunction, [amountRaw]);
    return this.call(CURRENT_LOCK.address, wallet, data, block);
  }

  /** Simulates `withdraw(_amount, _requestTimestamp, 0, 0x)` on the legacy lock from the wallet. */
  async simulateLegacyWithdraw(
    wallet: string,
    amountRaw: BigNumberish,
    requestTimestamp: BigNumberish,
    block: number
  ): Promise<SimulationResult> {
    const data = this.distributorInterface.encodeFunctionData(LEGACY_LOCK.withdrawFunction, [
      amountRaw,
      requestTimestamp,
      0,
      '0x'
    ]);
    return this.call(LEGACY_LOCK.address, wallet, data, block);
  }

  private async call(to: string, from: string, data: string, block: number): Promise<SimulationResult> {
    try {
      await this.provider.call({ to, from, data }, block);
      return { ok: true };
    } catch (error) {
      return { ok: false, revertReason: decodeRevertReason(error) };
    }
  }
}

/** Best-effort extraction of a Solidity `require`/`revert` string from a failed `eth_call`. */
const decodeRevertReason = (error: unknown): string => {
  const err = error as { reason?: string; data?: string; error?: { data?: string; body?: string }; message?: string };

  if (typeof err.reason === 'string' && err.reason.length > 0) return err.reason;

  const data = extractRevertData(err);
  if (data && data.startsWith(ERROR_STRING_SELECTOR)) {
    try {
      const [reason] = defaultAbiCoder.decode(['string'], '0x' + data.slice(ERROR_STRING_SELECTOR.length));
      return reason as string;
    } catch {
      // fall through to the generic message
    }
  }

  return err.message ?? 'unknown revert';
};

const extractRevertData = (err: { data?: string; error?: { data?: string; body?: string } }): string | undefined => {
  if (typeof err.data === 'string') return err.data;
  if (typeof err.error?.data === 'string') return err.error.data;
  if (typeof err.error?.body === 'string') {
    try {
      const parsed = JSON.parse(err.error.body) as { error?: { data?: string } };
      if (typeof parsed.error?.data === 'string') return parsed.error.data;
    } catch {
      return undefined;
    }
  }
  return undefined;
};
