import { Interface } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { CURRENT_LOCK, LEGACY_LOCK, NFTFI_TOKEN_ADDRESS } from '../src/constants';
import { LockReaderService } from '../src/chain/lock-reader.service';
import { WalletKind } from '../src/types';
import tokenLockAbi from '../src/abis/token-lock.abi.json';
import distributorTokenLockAbi from '../src/abis/distributor-token-lock.abi.json';
import nftfiTokenAbi from '../src/abis/nftfi-token.abi.json';

const tokenIface = new Interface(tokenLockAbi);
const distIface = new Interface(distributorTokenLockAbi);
const erc20Iface = new Interface(nftfiTokenAbi);

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const WALLET_A = '0x1111111111111111111111111111111111111111';
const WALLET_B = '0x2222222222222222222222222222222222222222';
const HASH_ACTIVE = '0x' + 'ab'.repeat(32);
const HASH_INACTIVE = '0x' + 'cd'.repeat(32);

interface Fixture {
  pausedCurrent: boolean;
  pausedLegacy: boolean;
  cooldownCurrent: string;
  cooldownLegacy: string;
  protocolSigner: string;
  balances: Record<string, string>;
  lockedCurrent: Record<string, string>;
  lockedLegacy: Record<string, string>;
  reqAmountsLegacy: Record<string, string>;
  withdrawRequests: Record<string, boolean>;
  code: Record<string, string>;
}

const baseFixture = (): Fixture => ({
  pausedCurrent: false,
  pausedLegacy: true,
  cooldownCurrent: '0',
  cooldownLegacy: '3542400',
  protocolSigner: ZERO_ADDRESS,
  balances: { [NFTFI_TOKEN_ADDRESS.toLowerCase()]: '0', [CURRENT_LOCK.address.toLowerCase()]: '8003911' },
  lockedCurrent: { [WALLET_A]: '1000', [WALLET_B]: '0' },
  lockedLegacy: { [WALLET_A]: '500' },
  reqAmountsLegacy: { [WALLET_A]: '500' },
  withdrawRequests: { [HASH_ACTIVE]: true, [HASH_INACTIVE]: false },
  code: {}
});

const isCurrent = (to: string): boolean => to.toLowerCase() === CURRENT_LOCK.address.toLowerCase();

const lockIface = (to: string): Interface => (isCurrent(to) ? tokenIface : distIface);

const singleResult = (fnName: string, args: ReadonlyArray<unknown>, to: string, fx: Fixture): unknown[] => {
  switch (fnName) {
    case 'paused':
      return [isCurrent(to) ? fx.pausedCurrent : fx.pausedLegacy];
    case 'cooldown':
      return [BigNumber.from(isCurrent(to) ? fx.cooldownCurrent : fx.cooldownLegacy)];
    case 'protocolSignerAddress':
      return [fx.protocolSigner];
    case 'balanceOf':
      return [BigNumber.from(fx.balances[(args[0] as string).toLowerCase()] ?? '0')];
    case 'lockedTokens':
      return [
        BigNumber.from((isCurrent(to) ? fx.lockedCurrent : fx.lockedLegacy)[(args[0] as string).toLowerCase()] ?? '0')
      ];
    case 'withdrawalRequestAmounts':
      return [BigNumber.from(fx.reqAmountsLegacy[(args[0] as string).toLowerCase()] ?? '0')];
    case 'withdrawRequests':
      return [fx.withdrawRequests[args[0] as string] ?? false];
    default:
      throw new Error(`unhandled fn ${fnName}`);
  }
};

const buildReader = (fx: Fixture): LockReaderService => {
  const provider = new StaticJsonRpcProvider('http://localhost:8545');

  jest.spyOn(provider, 'getBlockNumber').mockResolvedValue(123);
  jest.spyOn(provider, 'getBlock').mockResolvedValue({ timestamp: 1700000000 } as never);
  jest
    .spyOn(provider, 'getCode')
    .mockImplementation(async (address: string) => fx.code[(address as string).toLowerCase()] ?? '0x');
  jest.spyOn(provider, 'call').mockImplementation(async (tx: { to?: string; data?: string }) => {
    const to = tx.to as string;
    const data = tx.data as string;
    const iface = to.toLowerCase() === NFTFI_TOKEN_ADDRESS.toLowerCase() ? erc20Iface : lockIface(to);
    const frag = iface.getFunction(data.slice(0, 10));
    const args = iface.decodeFunctionData(frag, data);
    return iface.encodeFunctionResult(frag, singleResult(frag.name, args, to, fx));
  });

  return new LockReaderService(provider);
};

describe('LockReaderService', () => {
  it('returns the latest block number', async () => {
    expect(await buildReader(baseFixture()).getLatestBlock()).toBe(123);
  });

  it('returns the pinned block timestamp', async () => {
    expect(await buildReader(baseFixture()).getBlockTimestamp(99)).toBe(1700000000);
  });

  it('reads paused() for each lock', async () => {
    const reader = buildReader(baseFixture());
    expect(await reader.isPaused(CURRENT_LOCK, 1)).toBe(false);
    expect(await reader.isPaused(LEGACY_LOCK, 1)).toBe(true);
  });

  it('reads cooldown() for each lock', async () => {
    const reader = buildReader(baseFixture());
    expect((await reader.getCooldown(CURRENT_LOCK, 1)).toString()).toBe('0');
    expect((await reader.getCooldown(LEGACY_LOCK, 1)).toString()).toBe('3542400');
  });

  it('reads the legacy protocol signer address', async () => {
    const reader = buildReader(baseFixture());
    expect(await reader.getProtocolSignerAddress(LEGACY_LOCK, 1)).toBe('0x0000000000000000000000000000000000000000');
  });

  it('reads the NFTFI balance of an address', async () => {
    const reader = buildReader(baseFixture());
    expect((await reader.getNftfiBalanceOf(CURRENT_LOCK.address, 1)).toString()).toBe('8003911');
  });

  it('reads lockedTokens for the current lock, keyed by lower-cased wallet', async () => {
    const reader = buildReader(baseFixture());
    const locked = await reader.getLockedTokens(CURRENT_LOCK, [WALLET_A, WALLET_B], 1);
    expect(locked.get('0x1111111111111111111111111111111111111111')?.toString()).toBe('1000');
    expect(locked.get('0x2222222222222222222222222222222222222222')?.toString()).toBe('0');
  });

  it('reads lockedTokens for the legacy lock', async () => {
    const reader = buildReader(baseFixture());
    const locked = await reader.getLockedTokens(LEGACY_LOCK, [WALLET_A], 1);
    expect(locked.get('0x1111111111111111111111111111111111111111')?.toString()).toBe('500');
  });

  it('reads withdrawalRequestAmounts for the legacy lock', async () => {
    const reader = buildReader(baseFixture());
    const amounts = await reader.getWithdrawalRequestAmounts(LEGACY_LOCK, [WALLET_A], 1);
    expect(amounts.get('0x1111111111111111111111111111111111111111')?.toString()).toBe('500');
  });

  it('reads withdrawRequests and keys the result by hash', async () => {
    const reader = buildReader(baseFixture());
    const active = await reader.getWithdrawRequests(LEGACY_LOCK, [HASH_ACTIVE, HASH_INACTIVE], 1);
    expect(active.get(HASH_ACTIVE)).toBe(true);
    expect(active.get(HASH_INACTIVE)).toBe(false);
  });

  it('reads more entries than the concurrency cap in chunks', async () => {
    const fx = baseFixture();
    const wallets: string[] = [];
    for (let i = 1; i <= 25; i++) {
      const wallet = '0x' + i.toString(16).padStart(40, '0');
      wallets.push(wallet);
      fx.lockedCurrent[wallet] = String(i);
    }
    const reader = buildReader(fx);
    const locked = await reader.getLockedTokens(CURRENT_LOCK, wallets, 1);
    expect(locked.size).toBe(25);
    expect(locked.get('0x0000000000000000000000000000000000000019')?.toString()).toBe('25');
  });

  it('classifies wallets by their on-chain code', async () => {
    const fx = baseFixture();
    fx.code = {
      [WALLET_A]: '0x',
      [WALLET_B]: '0xef0100abcdef',
      '0x3333333333333333333333333333333333333333': '0x6080604052',
      '0x4444444444444444444444444444444444444444': ''
    };
    const reader = buildReader(fx);
    const kinds = await reader.classifyWallets(
      [WALLET_A, WALLET_B, '0x3333333333333333333333333333333333333333', '0x4444444444444444444444444444444444444444'],
      1
    );
    expect(kinds.get('0x1111111111111111111111111111111111111111')).toBe(WalletKind.Eoa);
    expect(kinds.get('0x2222222222222222222222222222222222222222')).toBe(WalletKind.Eip7702);
    expect(kinds.get('0x3333333333333333333333333333333333333333')).toBe(WalletKind.Contract);
    expect(kinds.get('0x4444444444444444444444444444444444444444')).toBe(WalletKind.Eoa);
  });
});
