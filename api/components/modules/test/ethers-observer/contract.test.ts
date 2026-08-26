import { EventFragment, FunctionFragment, ParamType } from '@ethersproject/abi';
import { utils as ethersUtils } from 'ethers';
import { Provider } from '@ethersproject/providers';
import { Contract } from '../../src/ethers-observer';
import { buildEventLog } from './factories';

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

describe(Contract.name, () => {
  describe(Contract.prototype.call.name, () => {
    it('should call a method', async () => {
      const contract = new Contract('address', ['abi']);
      const fnGetFunction = jest
        .spyOn(contract.interface, 'getFunction')
        .mockReturnValue({ outputs: [] } as FunctionFragment);
      const fnCall = jest.spyOn(contract.functions, 'method').mockResolvedValue('response');
      const result = await contract.call('method');

      expect(result).toEqual({});
      expect(fnGetFunction).toHaveBeenCalledWith('method');
      expect(fnCall).toHaveBeenCalledWith();
    });

    it('should throw an error if method is not found', async () => {
      const contract = new Contract('address', ['abi']);
      const fnGetFunction = jest.spyOn(contract.interface, 'getFunction').mockReturnValue(null);
      const fnCall = jest.spyOn(contract.functions, 'method').mockResolvedValue('response');

      await expect(contract.call('method')).rejects.toThrow('Method method not found in contract interface');
      expect(fnGetFunction).toHaveBeenCalledWith('method');
      expect(fnCall).not.toHaveBeenCalled();
    });

    it('should throw an error if method does not have outputs', async () => {
      const contract = new Contract('address', ['abi']);
      const fnGetFunction = jest.spyOn(contract.interface, 'getFunction').mockReturnValue({} as FunctionFragment);
      const fnCall = jest.spyOn(contract.functions, 'method').mockResolvedValue('response');

      await expect(contract.call('method')).rejects.toThrow('Method method does not have outputs');
      expect(fnGetFunction).toHaveBeenCalledWith('method');
      expect(fnCall).not.toHaveBeenCalled();
    });
  });

  describe(Contract.prototype.getEventPayload.name, () => {
    it('should get event payload', () => {
      const TransferABI = {
        anonymous: false,
        inputs: [
          { indexed: true, internalType: 'address', name: 'from', type: 'address' },
          { indexed: true, internalType: 'address', name: 'to', type: 'address' },
          { indexed: true, internalType: 'uint256', name: 'tokenId', type: 'uint256' },
          {
            components: [
              { internalType: 'address', name: 'recipient', type: 'address' },
              { internalType: 'uint16', name: 'rate16', type: 'uint16' },
              { internalType: 'uint96', name: 'rate96', type: 'uint96' },
              { internalType: 'uint160', name: 'rate160', type: 'uint160' },
              { internalType: 'uint256', name: 'rate256', type: 'uint256' },
              { internalType: 'uint256[]', name: 'rates256', type: 'uint256[]' },
              {
                components: [
                  { internalType: 'uint16', name: 'rate', type: 'uint16' },
                  { internalType: 'address payable', name: 'recipient', type: 'address' }
                ],
                internalType: 'struct Fee[]',
                name: 'fees',
                type: 'tuple[]'
              }
            ],
            internalType: 'struct FeeRate',
            name: 'makerFee',
            type: 'tuple'
          }
        ],
        name: 'Transfer',
        type: 'event'
      } as unknown as EventFragment;
      const contract = new Contract('address', [TransferABI]);
      const event = buildEventLog({
        topics: ['topic'],
        args: [
          '0x4838b106fce9647bdf1e7877bf73ce8b0bad5f97',
          '0xf81c0849d33696af3e1da43efda742954624f166',
          '1',
          [
            '0xf81c0849d33696af3e1da43efda742954624f166',
            2,
            20,
            200,
            2000,
            ['1000', '2000', '3000'],
            [
              [1000, '0xf81c0849d33696af3e1da43efda742954624f166'],
              [2000, '0xf82c0849d33696af3e1da43efda742954624f166'],
              [3000, '0xf83c0849d33696af3e1da43efda742954624f166']
            ]
          ]
        ]
      });
      const fnGetEvent = jest
        .spyOn(contract.interface, 'getEvent')
        .mockReturnValue(TransferABI as unknown as EventFragment);

      const result = contract.getEventPayload(event);

      expect(result).toEqual({
        from: '0x4838b106fce9647bdf1e7877bf73ce8b0bad5f97',
        to: '0xf81c0849d33696af3e1da43efda742954624f166',
        tokenId: '1',
        makerFee: {
          recipient: '0xf81c0849d33696af3e1da43efda742954624f166',
          rate16: 2,
          rate96: '20',
          rate160: '200',
          rate256: '2000',
          rates256: ['1000', '2000', '3000'],
          fees: [
            {
              rate: 1000,
              recipient: '0xf81c0849d33696af3e1da43efda742954624f166'
            },
            {
              rate: 2000,
              recipient: '0xf82c0849d33696af3e1da43efda742954624f166'
            },
            {
              rate: 3000,
              recipient: '0xf83c0849d33696af3e1da43efda742954624f166'
            }
          ]
        }
      });
      expect(fnGetEvent).toHaveBeenCalledWith('topic');
    });
  });

  describe(Contract.prototype.hasFunction.name, () => {
    it('should return true if function exists', async () => {
      const contract = new Contract('address', ['abi'], { call: jest.fn() } as unknown as Provider);
      Object.assign(contract, {
        address: 'address',
        provider: { call: jest.fn().mockResolvedValue(null) } as unknown as Provider
      });

      const fnGetFunction = jest.spyOn(contract.interface, 'getFunction').mockReturnValue({
        constant: true,
        inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' } as unknown as ParamType],
        name: 'ownerOf',
        outputs: [{ internalType: 'address', name: '', type: 'address' } as unknown as ParamType],
        payable: false,
        stateMutability: 'view',
        type: 'function',
        format: jest.fn(),
        _isFragment: true
      } as FunctionFragment);
      jest.spyOn(ethersUtils.Interface.prototype, 'getFunction').mockReturnValue({
        format: jest.fn().mockReturnValue('function ownerOf(uint256 tokenId) view returns (address)')
      } as unknown as FunctionFragment);
      jest.spyOn(ethersUtils.Interface.prototype, 'encodeFunctionData').mockReturnValue('0x12345678');
      const fnCall = jest.spyOn(contract.provider, 'call').mockResolvedValue('0x12345678');

      const result = await contract.hasFunction('ownerOf');

      expect(result).toBe(true);
      expect(fnCall).toHaveBeenCalledWith({
        to: 'address',
        data: '0x12345678'
      });
      expect(fnGetFunction).toHaveBeenCalledWith('ownerOf');
      expect(fnGetFunction).toHaveBeenCalledWith('ownerOf');
    });

    it('should return false if function does not exist', async () => {
      const contract = new Contract('address', ['abi'], { call: jest.fn() } as unknown as Provider);
      Object.assign(contract, {
        address: 'address',
        provider: { call: jest.fn().mockResolvedValue(null) } as unknown as Provider
      });

      const fnGetFunction = jest.spyOn(contract.interface, 'getFunction').mockReturnValue(null);
      jest.spyOn(ethersUtils.Interface.prototype, 'getFunction').mockReturnValue(null);
      const fnCall = jest.spyOn(contract.provider, 'call').mockRejectedValue(new Error('Method not found'));

      const result = await contract.hasFunction('nonExistentMethod');

      expect(result).toBe(false);
      expect(fnCall).not.toHaveBeenCalled();
      expect(fnGetFunction).toHaveBeenCalledWith('nonExistentMethod');
    });
  });

  describe(Contract.prototype.getDeploymentBlock.name, () => {
    it('should find deployment block', async () => {
      const contract = new Contract('address', ['abi'], { getCode: jest.fn() } as unknown as Provider);
      Object.assign(contract, {
        address: 'address',
        provider: {
          getCode: jest.fn().mockResolvedValue('0x'),
          getBlockNumber: jest.fn().mockResolvedValue(10)
        } as unknown as Provider
      });

      const fnGetCode = jest.spyOn(contract.provider, 'getCode').mockResolvedValueOnce('0x');
      fnGetCode.mockResolvedValueOnce('0x1234');
      fnGetCode.mockResolvedValueOnce('0x5678');

      const result = await contract.getDeploymentBlock();

      expect(result).toBe(6);
      expect(fnGetCode).toHaveBeenCalledTimes(3);
    });
  });
});
