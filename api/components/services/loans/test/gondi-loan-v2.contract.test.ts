import { FunctionFragment } from '@ethersproject/abi';
import { Cache } from 'cache-manager';
import { GondiLoanV2Contract } from '../src/subscribers/gondi';

jest.mock('@ethersproject/contracts', () => ({
  Contract: class {
    interface = {
      getFunction: jest.fn(),
      getEvent: jest.fn()
    };
    functions = {
      method: jest.fn()
    };
  }
}));

const mockCacheManager = { store: { get: jest.fn(), set: jest.fn() } } as unknown as Cache;

describe(GondiLoanV2Contract.name, () => {
  describe(GondiLoanV2Contract.prototype.getProtocolFee.name, () => {
    it('fetches protocol fee', async () => {
      const contract = new GondiLoanV2Contract('address', ['abi'], null, mockCacheManager);
      Object.assign(contract.functions, { getProtocolFee: jest.fn().mockResolvedValue([['0x0', '0']]) });

      (mockCacheManager.store.get as jest.Mock).mockResolvedValue(undefined);

      const fnGetFunction = jest.spyOn(contract.interface, 'getFunction').mockReturnValue({
        name: 'getProtocolFee',
        type: 'function',
        outputs: [
          {
            components: [
              { internalType: 'address', name: 'recipient', type: 'address' },
              { internalType: 'uint256', name: 'fraction', type: 'uint256' }
            ],
            internalType: 'struct IBaseLoan.ProtocolFee',
            name: 'null',
            type: 'tuple'
          }
        ]
      } as unknown as FunctionFragment);
      const result = await contract.getProtocolFee();

      expect(result).toEqual({ fraction: '0', recipient: '0x0' });
      expect(fnGetFunction).toHaveBeenCalledWith('getProtocolFee');
      expect(mockCacheManager.store.set as jest.Mock).toHaveBeenCalled();
    });
  });
});
