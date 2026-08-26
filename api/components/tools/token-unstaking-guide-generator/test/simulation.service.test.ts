import { defaultAbiCoder } from '@ethersproject/abi';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { SimulationService } from '../src/chain/simulation.service';

const WALLET = '0x1111111111111111111111111111111111111111';

const encodeErrorString = (reason: string): string =>
  '0x08c379a0' + defaultAbiCoder.encode(['string'], [reason]).slice(2);

const buildService = (callMock: jest.Mock): SimulationService => {
  const provider = { call: callMock } as unknown as StaticJsonRpcProvider;
  return new SimulationService(provider);
};

describe('SimulationService', () => {
  describe('simulateCurrentWithdraw', () => {
    it('returns ok and calls eth_call with the wallet as from and the withdrawNoCooldown calldata', async () => {
      const call = jest.fn().mockResolvedValue('0x');
      const result = await buildService(call).simulateCurrentWithdraw(WALLET, '1000', 25345421);

      expect(result).toEqual({ ok: true });
      expect(call).toHaveBeenCalledTimes(1);
      const [tx, block] = call.mock.calls[0];
      expect(tx.to).toBe('0x8a63B7D2B66FB054705731Cc7964b05e7Ad095cF');
      expect(tx.from).toBe('0x1111111111111111111111111111111111111111');
      expect(tx.data).toBe('0x58f18bfb00000000000000000000000000000000000000000000000000000000000003e8');
      expect(block).toBe(25345421);
    });
  });

  describe('simulateLegacyWithdraw', () => {
    it('returns ok and encodes withdraw(_amount, _requestTimestamp, 0, 0x) against the legacy lock', async () => {
      const call = jest.fn().mockResolvedValue('0x');
      const result = await buildService(call).simulateLegacyWithdraw(WALLET, '500', 1714480247, 25345421);

      expect(result).toEqual({ ok: true });
      const [tx] = call.mock.calls[0];
      expect(tx.to).toBe('0xe53FfaCaDbc4744bE405BAD4AbE9852348eBeC02');
      expect(tx.from).toBe('0x1111111111111111111111111111111111111111');
      expect(tx.data.startsWith('0xfe55892d')).toBe(true);
    });
  });

  describe('revert decoding', () => {
    it('uses error.reason when present', async () => {
      const call = jest.fn().mockRejectedValue({ reason: 'no request' });
      const result = await buildService(call).simulateCurrentWithdraw(WALLET, '1000', 1);
      expect(result).toEqual({ ok: false, revertReason: 'no request' });
    });

    it('decodes an Error(string) payload from error.data', async () => {
      const call = jest.fn().mockRejectedValue({ data: encodeErrorString('withdraw amount > total') });
      const result = await buildService(call).simulateCurrentWithdraw(WALLET, '1000', 1);
      expect(result).toEqual({ ok: false, revertReason: 'withdraw amount > total' });
    });

    it('decodes an Error(string) payload nested under error.error.data', async () => {
      const call = jest.fn().mockRejectedValue({ error: { data: encodeErrorString('cooldown not up') } });
      const result = await buildService(call).simulateCurrentWithdraw(WALLET, '1000', 1);
      expect(result).toEqual({ ok: false, revertReason: 'cooldown not up' });
    });

    it('decodes an Error(string) payload from a JSON error.error.body', async () => {
      const body = JSON.stringify({ error: { data: encodeErrorString('old requests exist') } });
      const call = jest.fn().mockRejectedValue({ error: { body } });
      const result = await buildService(call).simulateCurrentWithdraw(WALLET, '1000', 1);
      expect(result).toEqual({ ok: false, revertReason: 'old requests exist' });
    });

    it('falls back to error.message when no reason or decodable data is present', async () => {
      const call = jest.fn().mockRejectedValue({ message: 'connection reset' });
      const result = await buildService(call).simulateCurrentWithdraw(WALLET, '1000', 1);
      expect(result).toEqual({ ok: false, revertReason: 'connection reset' });
    });

    it('falls back to "unknown revert" when the error carries nothing usable', async () => {
      const call = jest.fn().mockRejectedValue({});
      const result = await buildService(call).simulateCurrentWithdraw(WALLET, '1000', 1);
      expect(result).toEqual({ ok: false, revertReason: 'unknown revert' });
    });

    it('falls back to the generic message when the error.error.body is not valid JSON', async () => {
      const call = jest.fn().mockRejectedValue({ error: { body: 'not-json' }, message: 'server error' });
      const result = await buildService(call).simulateCurrentWithdraw(WALLET, '1000', 1);
      expect(result).toEqual({ ok: false, revertReason: 'server error' });
    });
  });
});
