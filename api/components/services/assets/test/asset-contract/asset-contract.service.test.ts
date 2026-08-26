import { Test } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { getEthersToken } from 'nestjs-ethers';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { AssetContract, AssetContractType } from '../../src/asset-contract';
import { AssetERC721 } from '../../src/asset-contract/asset-erc721.contract';
import { AssetERC1155 } from '../../src/asset-contract/asset-erc1155.contract';
import { AssetPunk } from '../../src/asset-contract/asset-punk.contract';

jest.mock('@nftfi.api/modules/ethers-observer');

describe(AssetContract.name, () => {
  let service: AssetContract;
  let cacheManager: Cache;
  let mockAsset: AssetContractType;

  beforeEach(async () => {
    mockAsset = {
      isOwner: jest.fn()
    } as unknown as AssetContractType;

    const moduleRef = await Test.createTestingModule({
      providers: [
        AssetContract,
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn()
          }
        },
        {
          provide: getEthersToken(),
          useValue: { getBlock: jest.fn() }
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({})
          }
        }
      ]
    }).compile();

    service = moduleRef.get(AssetContract);
    cacheManager = moduleRef.get(CACHE_MANAGER);

    jest.clearAllMocks();
  });

  describe(AssetContract.prototype.getContractInstance.name, () => {
    it('should return existing contract instance from cache', async () => {
      service['assetInstances']['0x123'] = mockAsset;

      const instance = await service.getContractInstance('0x123');

      expect(instance).toBe(mockAsset);
      expect(service['assetInstances']['0x123']).toBe(mockAsset);
    });

    it('should create and return new contract instance for ERC721', async () => {
      const fnERC721 = jest.spyOn(AssetERC721.prototype, 'supportsInterface').mockResolvedValue(true);
      const fnERC1155 = jest.spyOn(AssetERC1155.prototype, 'supportsInterface').mockResolvedValue(false);
      const fnPunk = jest.spyOn(AssetPunk.prototype, 'supportsInterface').mockResolvedValue(false);

      const instance = await service.getContractInstance('0x123');

      expect(instance).toBeInstanceOf(AssetERC721);
      expect(fnERC721).toHaveBeenCalled();
      expect(fnERC1155).not.toHaveBeenCalled();
      expect(fnPunk).not.toHaveBeenCalled();
    });

    it('should create and return new contract instance for ERC1155', async () => {
      const fnERC721 = jest.spyOn(AssetERC721.prototype, 'supportsInterface').mockResolvedValue(false);
      const fnERC1155 = jest.spyOn(AssetERC1155.prototype, 'supportsInterface').mockResolvedValue(true);
      const fnPunk = jest.spyOn(AssetPunk.prototype, 'supportsInterface').mockResolvedValue(false);

      const instance = await service.getContractInstance('0x123');

      expect(instance).toBeInstanceOf(AssetERC1155);
      expect(fnERC721).toHaveBeenCalled();
      expect(fnERC1155).toHaveBeenCalled();
      expect(fnPunk).not.toHaveBeenCalled();
    });

    it('should create and return new contract instance for Punk', async () => {
      const fnERC721 = jest.spyOn(AssetERC721.prototype, 'supportsInterface').mockResolvedValue(false);
      const fnERC1155 = jest.spyOn(AssetERC1155.prototype, 'supportsInterface').mockResolvedValue(false);
      const fnPunk = jest.spyOn(AssetPunk.prototype, 'supportsInterface').mockResolvedValue(true);

      const instance = await service.getContractInstance('0x123');

      expect(instance).toBeInstanceOf(AssetPunk);
      expect(fnERC721).toHaveBeenCalled();
      expect(fnERC1155).toHaveBeenCalled();
      expect(fnPunk).toHaveBeenCalled();
    });

    it('should throw error for unsupported contract type', async () => {
      const fnERC721 = jest.spyOn(AssetERC721.prototype, 'supportsInterface').mockResolvedValue(false);
      const fnERC1155 = jest.spyOn(AssetERC1155.prototype, 'supportsInterface').mockResolvedValue(false);
      const fnPunk = jest.spyOn(AssetPunk.prototype, 'supportsInterface').mockResolvedValue(false);

      await expect(service.getContractInstance('0xunsupported')).rejects.toThrow(
        'Unsupported contract type for address: 0xunsupported'
      );

      expect(fnERC721).toHaveBeenCalled();
      expect(fnERC1155).toHaveBeenCalled();
      expect(fnPunk).toHaveBeenCalled();
    });
  });

  describe(AssetContract.prototype.isOwnerOf.name, () => {
    it('should return cached result if available', async () => {
      jest.spyOn(service, 'getContractInstance').mockResolvedValue(mockAsset);
      jest.spyOn(cacheManager, 'get').mockResolvedValue(true);

      const result = await service.isOwnerOf('0x123', '1', '0x456');

      expect(result).toBe(true);
      expect(cacheManager.get).toHaveBeenCalledWith('asset:owner:0x123:10x456');
      expect(mockAsset.isOwner).not.toHaveBeenCalled();
    });

    it('should fetch and cache result if not in cache', async () => {
      const mockAsset = {
        isOwner: jest.fn().mockResolvedValue(true)
      } as unknown as AssetContractType;
      jest.spyOn(service, 'getContractInstance').mockResolvedValue(mockAsset);
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(cacheManager, 'set').mockResolvedValue();

      const result = await service.isOwnerOf('0x123', '1', '0x456');

      expect(result).toBe(true);
      expect(cacheManager.get).toHaveBeenCalledWith('asset:owner:0x123:10x456');
      expect(cacheManager.set).toHaveBeenCalledWith('asset:owner:0x123:10x456', true, expect.any(Number));
      expect(mockAsset.isOwner).toHaveBeenCalledWith('1', '0x456');
    });
  });
});
