import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { AssetERC1155 } from '../../src/asset-contract/asset-erc1155.contract';

jest.mock('@ethersproject/contracts', () => ({
  Contract: class {
    functions = {
      balanceOf: jest.fn()
    };
  }
}));

describe(AssetERC1155.name, () => {
  let instance: AssetERC1155;
  let ethersProvider: StaticJsonRpcProvider;

  beforeEach(() => {
    ethersProvider = {} as unknown as StaticJsonRpcProvider;
    instance = new AssetERC1155('0x4838b106fce9647bdf1e7877bf73ce8b0bad5f97', ethersProvider);
  });

  it('should be able to create an instance of AssetERC1155', () => {
    expect(instance).not.toBeUndefined();
  });

  describe(AssetERC1155.prototype.isOwner.name, () => {
    it('should return true when balance is greater than 0', async () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      const fnCall = jest.spyOn(instance, 'call').mockResolvedValue({ null: 5 });

      const result = await instance.isOwner('1', address);

      expect(fnCall).toHaveBeenCalledWith('balanceOf', address, '1');
      expect(result).toEqual(true);
    });

    it('should return false when balance is 0', async () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      const fnCall = jest.spyOn(instance, 'call').mockResolvedValue({ null: 0 });

      const result = await instance.isOwner('1', address);

      expect(fnCall).toHaveBeenCalledWith('balanceOf', address, '1');
      expect(result).toEqual(false);
    });
  });

  describe(AssetERC1155.prototype.getOwner.name, () => {
    it('should return a placeholder address', async () => {
      const result = await instance.getOwner('1');
      expect(result).toEqual('0x000000000000000000000000000000000000000000');
    });
  });

  describe(AssetERC1155.prototype.supportsInterface.name, () => {
    it('should return true for ERC1155 interface', async () => {
      const fnCall = jest.spyOn(instance, 'call').mockResolvedValue({ null: true });

      const result = await instance.supportsInterface();

      expect(fnCall).toHaveBeenCalledWith('supportsInterface', '0xd9b67a26');
      expect(result).toEqual(true);
    });

    it('checks if contract supports functions with specific signatures', async () => {
      const fnCall = jest.spyOn(instance, 'call').mockRejectedValue(new Error('Function not found'));
      const hasFnBalanceOf = jest.spyOn(instance, 'hasFunction').mockResolvedValue(true);

      const result = await instance.supportsInterface();

      expect(fnCall).toHaveBeenCalledWith('supportsInterface', '0xd9b67a26');
      expect(hasFnBalanceOf).toHaveBeenCalledWith('balanceOf', 1);
      expect(result).toEqual(true);
    });
  });
});
