import { Interface } from '@ethersproject/abi';
import { Log } from '@ethersproject/abstract-provider';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { CURRENT_LOCK, LEGACY_LOCK } from '../src/constants';
import { EventDiscoveryService } from '../src/chain/event-discovery.service';
import distributorTokenLockAbi from '../src/abis/distributor-token-lock.abi.json';

const distIface = new Interface(distributorTokenLockAbi);

const LOCKED_TOPIC = distIface.getEventTopic('Locked');
const WITHDRAWAL_REQUESTED_TOPIC = distIface.getEventTopic('WithdrawalRequested');

const WALLET_A = '0x1111111111111111111111111111111111111111';
const WALLET_B = '0x2222222222222222222222222222222222222222';

const makeLog = (eventName: string, values: ReadonlyArray<unknown>, blockNumber: number, logIndex: number): Log => {
  const fragment = distIface.getEvent(eventName);
  const { data, topics } = distIface.encodeEventLog(fragment, values as unknown[]);
  return {
    blockNumber,
    blockHash: '0x' + '00'.repeat(32),
    transactionIndex: 0,
    removed: false,
    address: LEGACY_LOCK.address,
    data,
    topics,
    transactionHash: '0x' + '11'.repeat(32),
    logIndex
  };
};

const buildService = (logsByTopic: Record<string, Log[]>): EventDiscoveryService => {
  const provider = new StaticJsonRpcProvider('http://localhost:8545');
  jest.spyOn(provider, 'getLogs').mockImplementation(async (filter: { topics?: Array<string | string[] | null> }) => {
    const topic = filter.topics?.[0] as string;
    return logsByTopic[topic] ?? [];
  });
  return new EventDiscoveryService(provider);
};

describe('EventDiscoveryService', () => {
  it('returns the distinct lower-cased wallets that ever locked into the current lock', async () => {
    const service = buildService({
      [LOCKED_TOPIC]: [
        makeLog('Locked', ['1000', WALLET_A], 20040000, 0),
        makeLog('Locked', ['2000', WALLET_A], 20040001, 1),
        makeLog('Locked', ['3000', WALLET_B], 20040002, 2)
      ]
    });

    const wallets = await service.findCurrentLockWallets(CURRENT_LOCK.deployBlock);

    expect(wallets).toHaveLength(2);
    expect(wallets).toContain('0x1111111111111111111111111111111111111111');
    expect(wallets).toContain('0x2222222222222222222222222222222222222222');
  });

  it('counts the current lock WithdrawalRequested events', async () => {
    const service = buildService({
      [WITHDRAWAL_REQUESTED_TOPIC]: [
        makeLog('WithdrawalRequested', ['1000', WALLET_A, '1700000000'], 20040000, 0),
        makeLog('WithdrawalRequested', ['2000', WALLET_B, '1700000001'], 20040001, 1)
      ]
    });

    expect(await service.countCurrentWithdrawalRequests(CURRENT_LOCK.deployBlock)).toBe(2);
  });

  it('returns zero when the current lock never emitted WithdrawalRequested', async () => {
    const service = buildService({});
    expect(await service.countCurrentWithdrawalRequests(CURRENT_LOCK.deployBlock)).toBe(0);
  });

  it('reconstructs legacy request candidates from WithdrawalRequested logs', async () => {
    const service = buildService({
      [WITHDRAWAL_REQUESTED_TOPIC]: [
        makeLog('WithdrawalRequested', ['18112000000000000000000', WALLET_A, '1714480247'], 19600000, 5)
      ]
    });

    const candidates = await service.findLegacyRequestCandidates(LEGACY_LOCK.deployBlock);

    expect(candidates).toHaveLength(1);
    expect(candidates[0].wallet).toBe('0x1111111111111111111111111111111111111111');
    expect(candidates[0].amountRaw).toBe('18112000000000000000000');
    expect(candidates[0].requestTimestamp).toBe(1714480247);
    expect(candidates[0].blockNumber).toBe(19600000);
    expect(candidates[0].logIndex).toBe(5);
  });
});
