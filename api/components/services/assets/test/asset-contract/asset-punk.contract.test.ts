import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { AssetPunk } from '../../src/asset-contract/asset-punk.contract';

jest.mock('@ethersproject/contracts', () => ({
  Contract: class {
    functions = {
      punkIndexToAddress: jest.fn()
    };
  }
}));

describe(AssetPunk.name, () => {
  let instance: AssetPunk;
  let ethersProvider: StaticJsonRpcProvider;

  beforeEach(() => {
    ethersProvider = {} as unknown as StaticJsonRpcProvider;
    instance = new AssetPunk('0x4838b106fce9647bdf1e7877bf73ce8b0bad5f97', ethersProvider);
  });

  it('should be able to create an instance of AssetPunk', () => {
    expect(instance).not.toBeUndefined();
  });

  describe(AssetPunk.prototype.isOwner.name, () => {
    it('should return true when the address is the owner', async () => {
      const ownerAddress = '0x1234567890abcdef1234567890abcdef12345678';
      const fnCall = jest.spyOn(instance, 'call').mockResolvedValue({ null: ownerAddress });

      const result = await instance.isOwner('1', ownerAddress);

      expect(fnCall).toHaveBeenCalledWith('punkIndexToAddress', '1');
      expect(result).toEqual(true);
    });

    it('should return false when the address is not the owner', async () => {
      const ownerAddress = '0x1234567890abcdef1234567890abcdef12345678';
      const differentAddress = '0xabcdef1234567890abcdef1234567890abcdef12';
      const fnCall = jest.spyOn(instance, 'call').mockResolvedValue({ null: ownerAddress });

      const result = await instance.isOwner('1', differentAddress);

      expect(fnCall).toHaveBeenCalledWith('punkIndexToAddress', '1');
      expect(result).toEqual(false);
    });

    it('should handle case-insensitive address comparison', async () => {
      const ownerAddress = '0x1234567890abcdef1234567890abcdef12345678';
      const sameAddressDifferentCase = '0x1234567890ABCDEF1234567890ABCDEF12345678';
      const fnCall = jest.spyOn(instance, 'call').mockResolvedValue({ null: ownerAddress });

      const result = await instance.isOwner('1', sameAddressDifferentCase);

      expect(fnCall).toHaveBeenCalledWith('punkIndexToAddress', '1');
      expect(result).toEqual(true);
    });
  });

  describe(AssetPunk.prototype.supportsInterface.name, () => {
    it('checks for punkIndexToAddress function', async () => {
      const hasFunctionSpy = jest.spyOn(instance, 'hasFunction').mockResolvedValue(true);

      const result = await instance.supportsInterface();

      expect(hasFunctionSpy).toHaveBeenCalledWith('punkIndexToAddress', 1);
      expect(result).toEqual(true);
    });
  });
});
