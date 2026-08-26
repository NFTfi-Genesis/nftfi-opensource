import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AssetsFacade } from '@nftfi.api/facades/assets';
import { TokenStandard } from '@nftfi.api/repositories/postgres/collection';
import { ListingDeletedReason, ListingPreference, ListingRepository } from '@nftfi.api/repositories/postgres/listing';
import { AssetContract } from '@nftfi.api/services/assets';
import { ListingNotificationService } from '../src/listing-v1/listing-notification.service';
import { ListingV1Service } from '../src/listing-v1/listing-v1.service';

const BORROWER = '0x5f79bd35435a7b98493543db0fec7f55292e9e77';
const OTHER_ACCOUNT = '0x1111111111111111111111111111111111111111';
const NFT_CONTRACT = '0x8a90cab2b38dba80c64b7734e58ee1db38b8992e';
const NFT_TOKEN_ID = '7332';

const mockAssetDto = {
  id: 1,
  contract: NFT_CONTRACT,
  tokenId: NFT_TOKEN_ID,
  name: 'Doodle #7332',
  imageSmallUrl: '',
  imageMediumUrl: '',
  owners: [BORROWER],
  collection: {
    id: 1,
    contract: NFT_CONTRACT,
    tokenRange: '0:9999',
    tokenSupply: '10000',
    tokenStandard: TokenStandard.ERC721,
    name: 'Doodles',
    ranking: 1,
    imageUrl: '',
    whitelisted: true,
    openseaSlug: 'doodles-official'
  }
};

const mockListing = {
  id: 1,
  nftContract: NFT_CONTRACT,
  nftTokenId: NFT_TOKEN_ID,
  borrower: BORROWER,
  currency: null,
  duration: 604800,
  prorated: null,
  preference: ListingPreference.LowApr,
  createdAt: new Date('2026-04-13T10:00:00Z'),
  updatedAt: new Date('2026-04-13T10:00:00Z'),
  deletedAt: null,
  deletedReason: null,
  asset: { id: 1 }
};

const createBody = {
  nftContract: NFT_CONTRACT,
  nftTokenId: NFT_TOKEN_ID,
  borrower: BORROWER,
  duration: 604800,
  currency: null,
  prorated: null,
  preference: ListingPreference.LowApr
};

const updateBody = {
  duration: 1209600,
  currency: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  prorated: true,
  preference: ListingPreference.LowApr
};

const authToken = { account: BORROWER, multisig: {}, iat: 0, exp: 0 };

describe(ListingV1Service.name, () => {
  let service: ListingV1Service;
  let listingRepository: {
    find: jest.Mock;
    count: jest.Mock;
    findByAsset: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
    iterateAll: jest.Mock;
  };
  let assetsFacade: { getAssetByKey: jest.Mock; getAssets: jest.Mock };
  let notificationService: { notifyNewListing: jest.Mock };
  let assetContractService: { isOwnerOf: jest.Mock };
  let cacheClient: { keys: jest.Mock; del: jest.Mock };

  beforeEach(async () => {
    jest.resetAllMocks();

    listingRepository = {
      find: jest.fn(),
      count: jest.fn(),
      findByAsset: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      iterateAll: jest.fn()
    };
    assetsFacade = { getAssetByKey: jest.fn(), getAssets: jest.fn() };
    notificationService = { notifyNewListing: jest.fn() };
    assetContractService = { isOwnerOf: jest.fn() };
    cacheClient = { keys: jest.fn().mockResolvedValue([]), del: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ListingV1Service,
        { provide: ListingRepository, useValue: listingRepository },
        { provide: AssetsFacade, useValue: assetsFacade },
        { provide: ListingNotificationService, useValue: notificationService },
        { provide: AssetContract, useValue: assetContractService },
        { provide: CACHE_MANAGER, useValue: { store: { client: cacheClient } } }
      ]
    }).compile();

    service = moduleRef.get(ListingV1Service);
  });

  describe(ListingV1Service.prototype.create.name, () => {
    it('lets isOwnerOf errors propagate naturally (500)', async () => {
      listingRepository.findByAsset.mockResolvedValue(null);
      assetsFacade.getAssetByKey.mockResolvedValue(mockAssetDto);
      assetContractService.isOwnerOf.mockRejectedValue(new Error('RPC timeout'));

      await expect(service.create(createBody as never, authToken as never)).rejects.toThrow('RPC timeout');
    });

    it('re-throws ForbiddenException from isOwnerOf without wrapping', async () => {
      listingRepository.findByAsset.mockResolvedValue(null);
      assetsFacade.getAssetByKey.mockResolvedValue(mockAssetDto);
      assetContractService.isOwnerOf.mockResolvedValue(false);

      await expect(service.create(createBody as never, authToken as never)).rejects.toThrow(
        new ForbiddenException('Borrower does not own this asset')
      );
    });

    it('rejects when authenticated account does not match borrower', async () => {
      await expect(
        service.create(createBody as never, { ...authToken, account: OTHER_ACCOUNT } as never)
      ).rejects.toThrow(new ForbiddenException('Authenticated user must be the borrower'));

      expect(listingRepository.findByAsset).not.toHaveBeenCalled();
    });

    it('rejects when a listing already exists for the asset', async () => {
      listingRepository.findByAsset.mockResolvedValue(mockListing);

      await expect(service.create(createBody as never, authToken as never)).rejects.toThrow(
        new ConflictException('Listing already exists for this asset')
      );
      expect(assetsFacade.getAssetByKey).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when asset does not exist on-chain', async () => {
      listingRepository.findByAsset.mockResolvedValue(null);
      assetsFacade.getAssetByKey.mockResolvedValue(null);

      await expect(service.create(createBody as never, authToken as never)).rejects.toThrow(
        new NotFoundException(`Asset ${NFT_CONTRACT}/${NFT_TOKEN_ID} not found on-chain`)
      );
    });

    it('uses collection name in error when whitelisted is false', async () => {
      listingRepository.findByAsset.mockResolvedValue(null);
      assetsFacade.getAssetByKey.mockResolvedValue({
        ...mockAssetDto,
        collection: { ...mockAssetDto.collection, whitelisted: false, name: 'SomeCollection' }
      });

      await expect(service.create(createBody as never, authToken as never)).rejects.toThrow(
        new ForbiddenException('Collection SomeCollection is not whitelisted')
      );
    });

    it('falls back to contract address when collection name is missing', async () => {
      listingRepository.findByAsset.mockResolvedValue(null);
      assetsFacade.getAssetByKey.mockResolvedValue({
        ...mockAssetDto,
        collection: { ...mockAssetDto.collection, whitelisted: false, name: undefined }
      });

      await expect(service.create(createBody as never, authToken as never)).rejects.toThrow(
        new ForbiddenException(`Collection ${NFT_CONTRACT} is not whitelisted`)
      );
    });

    it('accepts Punks token standard', async () => {
      const punksAsset = {
        ...mockAssetDto,
        collection: { ...mockAssetDto.collection, tokenStandard: TokenStandard.Punks }
      };
      listingRepository.findByAsset.mockResolvedValue(null);
      listingRepository.create.mockResolvedValue(mockListing);
      assetsFacade.getAssetByKey.mockResolvedValue(punksAsset);
      assetContractService.isOwnerOf.mockResolvedValue(true);

      const result = await service.create(createBody as never, authToken as never);

      expect(result).toBe(mockListing);
      expect(listingRepository.create).toHaveBeenCalledWith({
        nftContract: NFT_CONTRACT,
        nftTokenId: NFT_TOKEN_ID,
        borrower: BORROWER,
        duration: 604800,
        currency: null,
        prorated: null,
        preference: ListingPreference.LowApr,
        asset: { id: 1 }
      });
      expect(notificationService.notifyNewListing).toHaveBeenCalledWith(NFT_CONTRACT, NFT_TOKEN_ID, punksAsset);
    });

    it('accepts ERC721 token standard and creates the listing', async () => {
      listingRepository.findByAsset.mockResolvedValue(null);
      listingRepository.create.mockResolvedValue(mockListing);
      assetsFacade.getAssetByKey.mockResolvedValue(mockAssetDto);
      assetContractService.isOwnerOf.mockResolvedValue(true);

      const result = await service.create(createBody as never, authToken as never);

      expect(result).toBe(mockListing);
      expect(notificationService.notifyNewListing).toHaveBeenCalledWith(NFT_CONTRACT, NFT_TOKEN_ID, mockAssetDto);
    });

    it('rejects ERC1155 token standard', async () => {
      listingRepository.findByAsset.mockResolvedValue(null);
      assetsFacade.getAssetByKey.mockResolvedValue({
        ...mockAssetDto,
        collection: { ...mockAssetDto.collection, tokenStandard: TokenStandard.ERC1155 }
      });

      await expect(service.create(createBody as never, authToken as never)).rejects.toThrow(
        new ForbiddenException('Only ERC721 and Punks assets are supported for listings')
      );
    });

    it('re-throws non-unique-constraint errors from repository create', async () => {
      listingRepository.findByAsset.mockResolvedValue(null);
      listingRepository.create.mockRejectedValue(new Error('connection lost'));
      assetsFacade.getAssetByKey.mockResolvedValue(mockAssetDto);
      assetContractService.isOwnerOf.mockResolvedValue(true);

      await expect(service.create(createBody as never, authToken as never)).rejects.toThrow('connection lost');
    });
  });

  describe(ListingV1Service.prototype.getMany.name, () => {
    it('passes ASC sort direction when specified', async () => {
      listingRepository.find.mockResolvedValue([]);

      await service.getMany({ page: 1, limit: 50, sortBy: 'createdAt', sortDirection: 'asc' } as never);

      expect(listingRepository.find).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ sort: { by: 'createdAt', direction: 'ASC' } })
      );
    });

    it('passes DESC sort direction when specified', async () => {
      listingRepository.find.mockResolvedValue([]);

      await service.getMany({ page: 2, limit: 25, sortBy: 'createdAt', sortDirection: 'desc' } as never);

      expect(listingRepository.find).toHaveBeenCalledWith(
        {
          borrower: undefined,
          currency: undefined,
          duration: undefined,
          collectionIds: undefined
        },
        { skip: 25, limit: 25, sort: { by: 'createdAt', direction: 'DESC' } }
      );
    });

    it('passes undefined sort when sortBy is not specified', async () => {
      listingRepository.find.mockResolvedValue([]);

      await service.getMany({ page: 1, limit: 50 } as never);

      expect(listingRepository.find).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ sort: undefined })
      );
    });

    it('forwards filter fields to the repository', async () => {
      listingRepository.find.mockResolvedValue([]);

      await service.getMany({
        page: 1,
        limit: 10,
        borrower: BORROWER,
        currency: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        duration: 604800,
        collectionIds: [1, 2]
      } as never);

      expect(listingRepository.find).toHaveBeenCalledWith(
        {
          borrower: BORROWER,
          currency: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          duration: 604800,
          collectionIds: [1, 2]
        },
        { skip: 0, limit: 10, sort: undefined }
      );
    });
  });

  describe(ListingV1Service.prototype.count.name, () => {
    it('delegates to repository count with built filter', async () => {
      listingRepository.count.mockResolvedValue(42);

      const total = await service.count({
        page: 1,
        limit: 50,
        borrower: BORROWER,
        currency: null,
        duration: 604800,
        collectionIds: [1]
      } as never);

      expect(total).toBe(42);
      expect(listingRepository.count).toHaveBeenCalledWith({
        borrower: BORROWER,
        currency: null,
        duration: 604800,
        collectionIds: [1]
      });
    });
  });

  describe(ListingV1Service.prototype.getManyByFilter.name, () => {
    it('paginates with createdAt DESC sort', async () => {
      listingRepository.find.mockResolvedValue([mockListing]);

      const result = await service.getManyByFilter({ borrower: BORROWER }, { page: 3, limit: 20 });

      expect(result).toEqual([mockListing]);
      expect(listingRepository.find).toHaveBeenCalledWith(
        { borrower: BORROWER },
        { skip: 40, limit: 20, sort: { by: 'createdAt', direction: 'DESC' } }
      );
    });
  });

  describe(ListingV1Service.prototype.countByFilter.name, () => {
    it('delegates to repository count with the provided filter', async () => {
      listingRepository.count.mockResolvedValue(7);

      const total = await service.countByFilter({ borrower: BORROWER });

      expect(total).toBe(7);
      expect(listingRepository.count).toHaveBeenCalledWith({ borrower: BORROWER });
    });
  });

  describe(ListingV1Service.prototype.update.name, () => {
    it('updates fields and invalidates cache when borrower matches', async () => {
      const updated = { ...mockListing, ...updateBody };
      listingRepository.update.mockResolvedValue(updated);

      const result = await service.update(mockListing as never, updateBody as never, authToken as never);

      expect(result).toBe(updated);
      expect(listingRepository.update).toHaveBeenCalledWith(1, {
        duration: 1209600,
        currency: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        prorated: true,
        preference: ListingPreference.LowApr
      });
      expect(cacheClient.keys).toHaveBeenCalledWith('listings:*');
    });

    it('rejects when authenticated user is not the borrower', async () => {
      await expect(
        service.update(mockListing as never, updateBody as never, { ...authToken, account: OTHER_ACCOUNT } as never)
      ).rejects.toThrow(new ForbiddenException('Authenticated user must be the borrower'));
      expect(listingRepository.update).not.toHaveBeenCalled();
    });
  });

  describe(ListingV1Service.prototype.delete.name, () => {
    it('soft-deletes with USER_ACTION reason when borrower matches', async () => {
      await service.delete(mockListing as never, authToken as never);

      expect(listingRepository.softDelete).toHaveBeenCalledWith(1, 'USER_ACTION');
      expect(cacheClient.keys).toHaveBeenCalledWith('listings:*');
    });

    it('rejects when authenticated user is not the borrower', async () => {
      await expect(
        service.delete(mockListing as never, { ...authToken, account: OTHER_ACCOUNT } as never)
      ).rejects.toThrow(new ForbiddenException('Authenticated user must be the borrower'));
      expect(listingRepository.softDelete).not.toHaveBeenCalled();
    });
  });

  describe(ListingV1Service.prototype.deleteByAsset.name, () => {
    it('soft-deletes listing with given reason', async () => {
      listingRepository.findByAsset.mockResolvedValue(mockListing);

      await service.deleteByAsset(NFT_CONTRACT, NFT_TOKEN_ID, ListingDeletedReason.LoanStarted);

      expect(listingRepository.softDelete).toHaveBeenCalledWith(1, 'LOAN_STARTED');
    });

    it('lower-cases nftContract when looking up the listing', async () => {
      listingRepository.findByAsset.mockResolvedValue(null);

      await service.deleteByAsset(NFT_CONTRACT.toUpperCase(), NFT_TOKEN_ID, ListingDeletedReason.LoanStarted);

      expect(listingRepository.findByAsset).toHaveBeenCalledWith(NFT_CONTRACT, NFT_TOKEN_ID);
    });

    it('silently succeeds if listing does not exist', async () => {
      listingRepository.findByAsset.mockResolvedValue(null);

      await service.deleteByAsset(NFT_CONTRACT, NFT_TOKEN_ID, ListingDeletedReason.LoanStarted);

      expect(listingRepository.softDelete).not.toHaveBeenCalled();
    });
  });

  describe(ListingV1Service.prototype.deleteTransferredListings.name, () => {
    it('deletes listing when borrower no longer owns asset', async () => {
      listingRepository.iterateAll.mockImplementation(async function* () {
        yield mockListing;
      });
      listingRepository.findByAsset.mockResolvedValue(mockListing);
      assetContractService.isOwnerOf.mockResolvedValue(false);

      await service.deleteTransferredListings();

      expect(listingRepository.softDelete).toHaveBeenCalledWith(1, 'OWNERSHIP_CHANGED');
    });

    it('skips listing when borrower still owns asset', async () => {
      listingRepository.iterateAll.mockImplementation(async function* () {
        yield mockListing;
      });
      assetContractService.isOwnerOf.mockResolvedValue(true);

      await service.deleteTransferredListings();

      expect(listingRepository.softDelete).not.toHaveBeenCalled();
    });

    it('skips listing on ownership check error', async () => {
      listingRepository.iterateAll.mockImplementation(async function* () {
        yield mockListing;
      });
      assetContractService.isOwnerOf.mockRejectedValue(new Error('RPC timeout'));

      await service.deleteTransferredListings();

      expect(listingRepository.softDelete).not.toHaveBeenCalled();
    });

    it('tolerates non-Error thrown values from ownership check', async () => {
      listingRepository.iterateAll.mockImplementation(async function* () {
        yield mockListing;
      });
      assetContractService.isOwnerOf.mockRejectedValue(undefined);

      await expect(service.deleteTransferredListings()).resolves.toBeUndefined();
      expect(listingRepository.softDelete).not.toHaveBeenCalled();
    });
  });

  describe(ListingV1Service.prototype.toDtos.name, () => {
    it('attaches matching asset to each listing and serializes via class-transformer', async () => {
      assetsFacade.getAssets.mockResolvedValue([mockAssetDto]);

      const dtos = await service.toDtos([mockListing] as never);

      expect(assetsFacade.getAssets).toHaveBeenCalledWith({
        keys: [{ contract: NFT_CONTRACT, tokenId: NFT_TOKEN_ID }]
      });
      expect(dtos).toHaveLength(1);
      expect(dtos[0].id).toBe(1);
      expect(dtos[0].borrower).toBe('0x5f79bd35435a7b98493543db0fec7f55292e9e77');
      expect(dtos[0].duration).toBe(604800);
      expect(dtos[0].preference).toBe('lowApr');
      expect(dtos[0].asset).toEqual(mockAssetDto);
    });

    it('returns asset as undefined when no matching asset is found', async () => {
      assetsFacade.getAssets.mockResolvedValue([]);

      const dtos = await service.toDtos([mockListing] as never);

      expect(dtos).toHaveLength(1);
      expect(dtos[0].asset).toBeUndefined();
    });
  });

  describe('invalidateCache', () => {
    it('deletes redis keys under the listings scope in batches of 100', async () => {
      const keys = Array.from({ length: 205 }, (_, i) => `listings:http:get-many:key-${i}`);
      cacheClient.keys.mockResolvedValue(keys);
      listingRepository.findByAsset.mockResolvedValue(null);
      listingRepository.create.mockResolvedValue(mockListing);
      assetsFacade.getAssetByKey.mockResolvedValue(mockAssetDto);
      assetContractService.isOwnerOf.mockResolvedValue(true);

      await service.create(createBody as never, authToken as never);

      expect(cacheClient.keys).toHaveBeenCalledWith('listings:*');
      expect(cacheClient.del).toHaveBeenCalledTimes(3);
      expect(cacheClient.del).toHaveBeenNthCalledWith(1, ...keys.slice(0, 100));
      expect(cacheClient.del).toHaveBeenNthCalledWith(2, ...keys.slice(100, 200));
      expect(cacheClient.del).toHaveBeenNthCalledWith(3, ...keys.slice(200, 205));
    });
  });
});
