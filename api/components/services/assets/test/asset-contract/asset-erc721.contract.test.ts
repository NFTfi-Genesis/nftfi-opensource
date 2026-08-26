import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { AssetERC721 } from '../../src/asset-contract/asset-erc721.contract';

jest.mock('@ethersproject/contracts', () => ({
  Contract: class {
    functions = {
      ownerOf: jest.fn()
    };
  }
}));

describe(AssetERC721.name, () => {
  let instance: AssetERC721;
  let ethersProvider: StaticJsonRpcProvider;

  beforeEach(() => {
    ethersProvider = {} as unknown as StaticJsonRpcProvider;
    instance = new AssetERC721('0x4838b106fce9647bdf1e7877bf73ce8b0bad5f97', ethersProvider);
  });

  it('should be able to create an instance of AssetERC721', () => {
    expect(instance).not.toBeUndefined();
  });

  describe(AssetERC721.prototype.isOwner.name, () => {
    it('should return true when the address is the owner', async () => {
      const ownerAddress = '0x1234567890abcdef1234567890abcdef12345678';
      const fnCall = jest.spyOn(instance, 'call').mockResolvedValue({ null: ownerAddress });

      const result = await instance.isOwner('1', ownerAddress);

      expect(fnCall).toHaveBeenCalledWith('ownerOf', '1');
      expect(result).toEqual(true);
    });

    it('should return false when the address is not the owner', async () => {
      const ownerAddress = '0x1234567890abcdef1234567890abcdef12345678';
      const differentAddress = '0xabcdef1234567890abcdef1234567890abcdef12';
      const fnCall = jest.spyOn(instance, 'call').mockResolvedValue({ null: ownerAddress });

      const result = await instance.isOwner('1', differentAddress);

      expect(fnCall).toHaveBeenCalledWith('ownerOf', '1');
      expect(result).toEqual(false);
    });

    it('should handle case-insensitive address comparison', async () => {
      const ownerAddress = '0x1234567890abcdef1234567890abcdef12345678';
      const sameAddressDifferentCase = '0x1234567890ABCDEF1234567890ABCDEF12345678';
      const fnCall = jest.spyOn(instance, 'call').mockResolvedValue({ null: ownerAddress });

      const result = await instance.isOwner('1', sameAddressDifferentCase);

      expect(fnCall).toHaveBeenCalledWith('ownerOf', '1');
      expect(result).toEqual(true);
    });
  });

  describe(AssetERC721.prototype.supportsInterface.name, () => {
    it('should return true if the contract supports ERC721 interface', async () => {
      const fnCall = jest.spyOn(instance, 'call').mockResolvedValue({ null: true });
      const hasFnOwnerOf = jest.spyOn(instance, 'hasFunction').mockResolvedValue(true);

      const result = await instance.supportsInterface();

      expect(fnCall).toHaveBeenCalledWith('supportsInterface', '0x80ac58cd');
      expect(hasFnOwnerOf).not.toHaveBeenCalled();
      expect(result).toEqual(true);
    });

    it('checks if contract contains functions with specific signatures', async () => {
      const fnCall = jest.spyOn(instance, 'call').mockResolvedValue({ null: false });
      const hasFnOwnerOf = jest.spyOn(instance, 'hasFunction').mockResolvedValue(true);

      const result = await instance.supportsInterface();

      expect(fnCall).toHaveBeenCalledWith('supportsInterface', '0x80ac58cd');
      expect(hasFnOwnerOf).toHaveBeenCalledWith('ownerOf', 1);
      expect(result).toEqual(true);
    });
  });
});
