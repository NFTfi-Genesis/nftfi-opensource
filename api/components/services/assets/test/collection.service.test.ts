import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Mutex } from 'redis-semaphore';
import {
  CollectionRepository,
  CollectionStatsRepository,
  TokenStandard
} from '@nftfi.api/repositories/postgres/collection';
import { CollectionFloorPriceRepository } from '@nftfi.api/repositories/postgres/collection-floor-price';
import { MarketLoanProtocol } from '@nftfi.api/repositories/postgres/market-loan';
import { buildCollectionEntity } from '@nftfi.api/repositories/postgres/factories/collection';
import { HealthService } from '@nftfi.api/modules/health';
import { CollectionProjection } from '@nftfi.api/facades/assets';
import { CollectionService } from '../src/collection';
import { CollectionMetadataService } from '../src/collection/collection-metadata.service';
import { CollectionFloorPriceService } from '../src/collection/collection-floor-price.service';

jest.mock('redis-semaphore');

describe(CollectionService.name, () => {
  let service: CollectionService;
  let collectionRepository: CollectionRepository;
  let collectionStatsRepository: CollectionStatsRepository;
  let metadataService: CollectionMetadataService;
  let floorPriceService: CollectionFloorPriceService;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => void 0);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => void 0);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => void 0);

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-01-01T00:00:00Z'));
  });

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        CollectionService,
        {
          provide: CollectionRepository,
          useValue: {
            findByContractMask: jest.fn(),
            create: jest.fn(),
            createMany: jest.fn(),
            updateById: jest.fn(),
            updateByIds: jest.fn(),
            find: jest.fn(),
            findBySlug: jest.fn(),
            findBySlugs: jest.fn(),
            findByContracts: jest.fn(),
            findByContract: jest.fn(),
            findByBorrower: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
            countByBorrower: jest.fn(),
            iterate: jest.fn(),
            iterateOverNonEmptyImageEntries: jest.fn(),
            iterateOverEmptyImageEntries: jest.fn(),
            iterateOverEntriesWithNpfSlug: jest.fn(),
            iterateOverEntriesWithEmptyNpfSlug: jest.fn()
          }
        },
        {
          provide: CollectionStatsRepository,
          useValue: {
            findByIds: jest.fn()
          }
        },
        {
          provide: CollectionFloorPriceRepository,
          useValue: {
            createMany: jest.fn(),
            findLatestByNpfSlug: jest.fn(),
            findLatestByNpfSlugs: jest.fn()
          }
        },
        {
          provide: CollectionMetadataService,
          useValue: {
            isLinkValid: jest.fn(),
            getOpenseaSlug: jest.fn(),
            getImageUrl: jest.fn(),
            resolveMissingImageUrl: jest.fn(),
            getName: jest.fn(),
            getTokenRange: jest.fn(),
            getTokenStandard: jest.fn(),
            getSlugsAndRanges: jest.fn(),
            getNftMetadata: jest.fn(),
            getNpfSlug: jest.fn(),
            getDefaultTokenRange: jest.fn(),
            getReleasedAt: jest.fn(),
            isSupportedTokenStandard: jest.fn()
          }
        },
        {
          provide: CollectionFloorPriceService,
          useValue: {
            refreshCollection: jest.fn(),
            getCollectionToPricePairs: jest.fn(),
            getCollectionPrice: jest.fn(),
            toDto: jest.fn()
          }
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            store: {
              client: {
                get: jest.fn(),
                set: jest.fn(),
                del: jest.fn()
              }
            }
          }
        },
        {
          provide: HealthService,
          useValue: {
            on: jest.fn(),
            off: jest.fn(),
            onApplicationShutdown: jest.fn()
          }
        }
      ]
    }).compile();

    service = moduleRef.get(CollectionService);
    collectionRepository = moduleRef.get(CollectionRepository);
    collectionStatsRepository = moduleRef.get(CollectionStatsRepository);
    metadataService = moduleRef.get(CollectionMetadataService);
    floorPriceService = moduleRef.get(CollectionFloorPriceService);
  });

  describe(CollectionService.prototype.getByKey.name, () => {
    it('retrieves collection by contract mask', async () => {
      const fnFind = jest.spyOn(collectionRepository, 'findByContract').mockResolvedValue([
        buildCollectionEntity({
          id: 1,
          openseaSlug: 'opensea'
        })
      ]);
      jest.spyOn(Mutex.prototype, 'tryAcquire').mockResolvedValue(true);
      jest.spyOn(Mutex.prototype, 'release').mockResolvedValue();
      const fnGetSlug = jest.spyOn(metadataService, 'getOpenseaSlug').mockResolvedValue('opensea');
      const fnGetFloorPrices = jest.spyOn(floorPriceService, 'refreshCollection');
      const fnUpdateRankings = jest.spyOn(service, 'updateRankings').mockResolvedValue();
      const fnUpdate = jest.spyOn(collectionRepository, 'updateByIds');

      const collection = await service.getByKey('0x123', '1');
      expect(collection).toEqual(
        expect.objectContaining({
          contract: '0x123',
          id: 1,
          openseaSlug: 'opensea',
          tokenRange: ['1', '2'],
          tokenStandard: TokenStandard.ERC721
        })
      );
      expect(fnFind).toHaveBeenCalledWith('0x123');
      expect(fnGetFloorPrices).not.toHaveBeenCalled();
      expect(fnUpdateRankings).not.toHaveBeenCalled();
      expect(fnUpdate).not.toHaveBeenCalled();
      expect(fnGetSlug).toHaveBeenCalledWith('0x123', '1');
    });

    it('creates collection', async () => {
      const collection = buildCollectionEntity({
        id: 1,
        contract: '0x000000000000003607fce1ac9e043a86675c5c2f',
        tokenRangeBegin: '1',
        tokenRangeEnd: '1',
        tokenStandard: TokenStandard.Punks,
        npfSlug: 'cryptopunks',
        openseaSlug: 'cryptopunks-721',
        name: 'CryptoPunks',
        imageUrl: 'https://example.com/cryptopunks.png',
        ranking: 0,
        releasedAt: new Date('2017-01-01'),
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-02T00:00:00.000Z'),
        whitelisted: false
      });
      jest.spyOn(Mutex.prototype, 'tryAcquire').mockResolvedValue(true);
      jest.spyOn(Mutex.prototype, 'release').mockResolvedValue();
      const fnGetFloorPrices = jest.spyOn(floorPriceService, 'refreshCollection').mockImplementation(jest.fn());
      const fnUpdateRankings = jest.spyOn(service, 'updateRankings').mockResolvedValue();
      const fnFind = jest.spyOn(collectionRepository, 'findByContract').mockResolvedValue([]);
      const fnCreate = jest.spyOn(collectionRepository, 'create').mockResolvedValue(collection);
      const fnGetSlug = jest.spyOn(metadataService, 'getOpenseaSlug').mockResolvedValue('opensea');
      const fnGetTokenRange = jest
        .spyOn(metadataService, 'getDefaultTokenRange')
        .mockReturnValue(collection.tokenRange);
      const fnGetReleasedAt = jest.spyOn(metadataService, 'getReleasedAt').mockResolvedValue(collection.releasedAt);
      const fnGetImageUrl = jest
        .spyOn(metadataService, 'getImageUrl')
        .mockResolvedValue('https://example.com/cryptopunks.png');
      const fnGetName = jest.spyOn(metadataService, 'getName').mockResolvedValue('CryptoPunks');
      const fnGetContract = jest.spyOn(metadataService, 'getTokenStandard').mockResolvedValue(TokenStandard.Punks);
      const fnIsSupported = jest.spyOn(metadataService, 'isSupportedTokenStandard').mockResolvedValue(true);

      const promise = await service.getByKey('0x000000000000003607fce1ac9e043a86675c5c2f', '1');
      jest.runOnlyPendingTimers();

      expect(promise).toEqual(
        expect.objectContaining({
          contract: '0x000000000000003607fce1ac9e043a86675c5c2f',
          id: 1,
          tokenRangeBegin: '1',
          tokenRangeEnd: '1',
          tokenRange: ['1', '1'],
          tokenStandard: TokenStandard.Punks
        })
      );
      expect(fnFind).toHaveBeenCalledWith('0x000000000000003607fce1ac9e043a86675c5c2f');
      expect(fnCreate).toHaveBeenCalledWith({
        contract: '0x000000000000003607fce1ac9e043a86675c5c2f',
        tokenRangeBegin: '1',
        tokenRangeEnd: '1',
        tokenStandard: TokenStandard.Punks,
        name: 'CryptoPunks',
        npfSlug: null,
        imageUrl: 'https://example.com/cryptopunks.png',
        openseaSlug: 'opensea',
        whitelisted: false,
        ranking: 0,
        releasedAt: new Date('2017-01-01')
      });
      expect(fnGetName).toHaveBeenCalledWith('0x000000000000003607fce1ac9e043a86675c5c2f', '1');
      expect(fnGetImageUrl).toHaveBeenCalledWith('0x000000000000003607fce1ac9e043a86675c5c2f', '1', {
        timeoutMs: 1000
      });
      expect(fnGetFloorPrices).not.toHaveBeenCalled();
      expect(fnUpdateRankings).toHaveBeenCalledWith([collection]);
      expect(fnGetTokenRange).toHaveBeenCalledWith('1');
      expect(fnGetReleasedAt).toHaveBeenCalledWith('0x000000000000003607fce1ac9e043a86675c5c2f', '1');
      expect(fnGetContract).toHaveBeenCalledWith('0x000000000000003607fce1ac9e043a86675c5c2f');
      expect(fnGetSlug).toHaveBeenCalledTimes(1);
      expect(fnGetSlug).toHaveBeenCalledWith('0x000000000000003607fce1ac9e043a86675c5c2f', '1');
      expect(fnIsSupported).toHaveBeenCalledWith('0x000000000000003607fce1ac9e043a86675c5c2f');
    });

    it('extends collection range if tokenId is out of range', async () => {
      const collection = buildCollectionEntity({
        id: 1,
        contract: '0x000000000000003607fce1ac9e043a86675c5c2f',
        tokenRangeBegin: '1',
        tokenRangeEnd: '10',
        tokenStandard: TokenStandard.ERC721,
        npfSlug: 'cryptopunks',
        openseaSlug: 'cryptopunks-721',
        name: 'CryptoPunks',
        imageUrl: 'https://example.com/cryptopunks.png',
        ranking: 1,
        releasedAt: new Date('2017-01-01'),
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-02T00:00:00.000Z'),
        whitelisted: false
      });
      jest.spyOn(Mutex.prototype, 'tryAcquire').mockResolvedValue(true);
      jest.spyOn(Mutex.prototype, 'release').mockResolvedValue();
      const fnFind = jest.spyOn(collectionRepository, 'findByContract').mockResolvedValue([collection]);
      const fnUpdate = jest.spyOn(collectionRepository, 'updateByIds').mockResolvedValue(null);
      const fnGetSlug = jest.spyOn(metadataService, 'getOpenseaSlug').mockResolvedValue('cryptopunks-721');

      const result = await service.getByKey('0x000000000000003607fce1ac9e043a86675c5c2f', '11');

      expect(result).toEqual(expect.objectContaining({ id: 1, tokenRange: ['1', '11'] }));
      expect(fnFind).toHaveBeenCalledWith('0x000000000000003607fce1ac9e043a86675c5c2f');
      expect(fnUpdate).toHaveBeenCalledWith([1], { tokenRangeBegin: '1', tokenRangeEnd: '11' });
      expect(fnGetSlug).toHaveBeenCalledWith('0x000000000000003607fce1ac9e043a86675c5c2f', '11');
      expect(fnGetSlug).toHaveBeenCalledTimes(1);
    });

    it('skips collection creation if contract is not supported', async () => {
      jest.spyOn(Mutex.prototype, 'tryAcquire').mockResolvedValue(true);
      jest.spyOn(Mutex.prototype, 'release').mockResolvedValue();
      const fnFind = jest.spyOn(collectionRepository, 'findByContract').mockResolvedValue([]);
      const fnGetFloorPrices = jest.spyOn(floorPriceService, 'refreshCollection');
      const fnUpdateRankings = jest.spyOn(service, 'updateRankings').mockResolvedValue();
      const fnCreate = jest.spyOn(collectionRepository, 'create');
      const fnGetSlug = jest.spyOn(metadataService, 'getOpenseaSlug');
      const fnGetTokenRange = jest.spyOn(metadataService, 'getDefaultTokenRange');
      const fnGetReleasedAt = jest.spyOn(metadataService, 'getReleasedAt');
      const fnGetImageUrl = jest.spyOn(metadataService, 'getImageUrl');
      const fnGetName = jest.spyOn(metadataService, 'getName');
      const fnGetContract = jest.spyOn(metadataService, 'getTokenStandard');
      const fnIsSupported = jest.spyOn(metadataService, 'isSupportedTokenStandard').mockResolvedValue(false);

      const result = await service.getByKey('0x000000000000003607fce1ac9e043a86675c5c2f', '1');
      jest.runOnlyPendingTimers();

      expect(result).toEqual(null);
      expect(fnFind).toHaveBeenCalledWith('0x000000000000003607fce1ac9e043a86675c5c2f');
      expect(fnCreate).not.toHaveBeenCalled();
      expect(fnGetName).not.toHaveBeenCalled();
      expect(fnGetImageUrl).not.toHaveBeenCalled();
      expect(fnGetFloorPrices).not.toHaveBeenCalled();
      expect(fnUpdateRankings).not.toHaveBeenCalled();
      expect(fnGetTokenRange).not.toHaveBeenCalled();
      expect(fnGetReleasedAt).not.toHaveBeenCalled();
      expect(fnGetContract).not.toHaveBeenCalled();
      expect(fnGetSlug).not.toHaveBeenCalled();
      expect(fnIsSupported).toHaveBeenCalledWith('0x000000000000003607fce1ac9e043a86675c5c2f');
    });

    it('returns single collection with null openseaSlug without calling slug lookup', async () => {
      const collection = buildCollectionEntity({
        id: 77,
        contract: '0xabc',
        tokenRangeBegin: '1',
        tokenRangeEnd: '10',
        openseaSlug: null
      });
      jest.spyOn(Mutex.prototype, 'tryAcquire').mockResolvedValue(true);
      jest.spyOn(Mutex.prototype, 'release').mockResolvedValue();
      jest.spyOn(collectionRepository, 'findByContract').mockResolvedValue([collection]);
      const fnGetSlug = jest.spyOn(metadataService, 'getOpenseaSlug');
      const fnUpdate = jest.spyOn(collectionRepository, 'updateByIds');

      const result = await service.getByKey('0xabc', '5');

      expect(result).toEqual(collection);
      expect(fnGetSlug).not.toHaveBeenCalled();
      expect(fnUpdate).not.toHaveBeenCalled();
    });
  });

  describe(CollectionService.prototype.getByContract.name, () => {
    it('retrieves collections by contract', async () => {
      const mockCollection = buildCollectionEntity({
        id: 1,
        contract: '0x123',
        name: 'Test Collection',
        imageUrl: 'https://example.com/collection-image.png',
        whitelisted: false
      });
      const fnFind = jest.spyOn(collectionRepository, 'findByContract').mockResolvedValue([mockCollection]);

      const collections = await service.getByContract('0x123');

      expect(collections).toEqual([
        expect.objectContaining({
          contract: '0x123',
          id: 1,
          tokenRangeBegin: '1',
          tokenRangeEnd: '2',
          tokenStandard: TokenStandard.ERC721
        })
      ]);
      expect(fnFind).toHaveBeenCalledWith('0x123');
    });
  });

  describe(CollectionService.prototype.getByBorrower.name, () => {
    it('retrieves collections by borrower with filters and pagination', async () => {
      const rows = [buildCollectionEntity({ id: 12, contract: '0xabc' })];
      const fnFind = jest.spyOn(collectionRepository, 'findByBorrower').mockResolvedValue(rows);

      const result = await service.getByBorrower('0xborrower', {
        page: 3,
        limit: 5,
        protocols: ['nftfi', 'arcade'] as MarketLoanProtocol[]
      });

      expect(fnFind).toHaveBeenCalledWith('0xborrower', { protocols: ['nftfi', 'arcade'] }, { skip: 10, limit: 5 });
      expect(result).toEqual(rows);
    });
  });

  describe(CollectionService.prototype.countByBorrower.name, () => {
    it('delegates borrower count to repository', async () => {
      const fnCount = jest.spyOn(collectionRepository, 'countByBorrower').mockResolvedValue(7);
      const query = { page: 2, limit: 10, protocols: ['nftfi'] as MarketLoanProtocol[] };

      const result = await service.countByBorrower('0xborrower', query);

      expect(fnCount).toHaveBeenCalledWith('0xborrower', query);
      expect(result).toBe(7);
    });
  });

  describe(CollectionService.prototype.getByKeys.name, () => {
    it('returns empty when no keys provided', async () => {
      const fnFindByContracts = jest.spyOn(collectionRepository, 'find');
      const fnGetByKey = jest.spyOn(service, 'getByKey');

      const result = await service.getByKeys([]);

      expect(result).toEqual([]);
      expect(fnFindByContracts).not.toHaveBeenCalled();
      expect(fnGetByKey).not.toHaveBeenCalled();
    });

    it('reuses existing collections and fetches missing ones', async () => {
      const existing = buildCollectionEntity({ id: 1, contract: '0xabc', tokenRangeBegin: '1', tokenRangeEnd: '10' });
      const fetched = buildCollectionEntity({ id: 2, contract: '0xdef', tokenRangeBegin: '5', tokenRangeEnd: '5' });
      const fnFindByContracts = jest.spyOn(collectionRepository, 'find').mockResolvedValue([existing]);
      const fnGetByKey = jest.spyOn(service, 'getByKey').mockResolvedValue(fetched);

      const result = await service.getByKeys([
        { contract: '0xabc', tokenId: '2' },
        { contract: '0xdef', tokenId: '5' }
      ]);

      expect(result).toEqual([existing, fetched]);
      expect(fnFindByContracts).toHaveBeenCalledWith({ contracts: ['0xabc', '0xdef'] });
      expect(fnGetByKey).toHaveBeenCalledWith('0xdef', '5');
    });
  });

  describe(CollectionService.prototype.updateMetadata.name, () => {
    it('updates collection metadata when changed', async () => {
      const collection = buildCollectionEntity({
        id: 1,
        contract: '0xabc',
        name: 'Old Name',
        imageUrl: 'https://example.com/old.png'
      });
      const fnUpdate = jest.spyOn(collectionRepository, 'updateByIds').mockResolvedValue(null);

      await service.updateMetadata(collection, { name: 'New Name' });

      expect(fnUpdate).toHaveBeenCalledWith([1], { name: 'New Name' });
    });

    it('skips update when metadata is unchanged', async () => {
      const collection = buildCollectionEntity({
        id: 1,
        name: 'Collection Name'
      });
      const fnUpdate = jest.spyOn(collectionRepository, 'updateByIds');

      await service.updateMetadata(collection, { name: 'Collection Name' });

      expect(fnUpdate).not.toHaveBeenCalled();
    });
  });

  describe(CollectionService.prototype.getMany.name, () => {
    it('retrieves multiple collections based on query params', async () => {
      const mockCollection = buildCollectionEntity({
        id: 1,
        contract: '0x123',
        name: 'Test Collection',
        imageUrl: 'https://example.com/collection-image.png',
        whitelisted: false
      });

      const fnFind = jest.spyOn(collectionRepository, 'find').mockResolvedValue([mockCollection]);

      const result = await service.getMany({ contracts: ['0x123'], whitelisted: false, page: 1, limit: 10 });

      expect(result).toEqual([
        expect.objectContaining({
          contract: '0x123',
          id: 1,
          tokenRangeBegin: '1',
          tokenRangeEnd: '2',
          tokenStandard: TokenStandard.ERC721,
          whitelisted: false
        })
      ]);
      expect(fnFind).toHaveBeenCalledWith(
        {
          ids: undefined,
          contracts: ['0x123'],
          whitelisted: false,
          loanAvgUsdMax: undefined,
          loanAvgUsdMin: undefined,
          loanTotalUsdMax: undefined,
          loanTotalUsdMin: undefined
        },
        {
          skip: 0,
          limit: 10,
          sort: { by: 'ranking', direction: 'DESC' }
        }
      );
    });

    it('supports queries without optional params', async () => {
      const fnFind = jest.spyOn(collectionRepository, 'find').mockResolvedValue([]);

      const result = await service.getMany({ page: 1, limit: 10 });

      expect(result).toEqual([]);
      expect(fnFind).toHaveBeenCalledWith(
        {
          ids: undefined,
          contracts: undefined,
          whitelisted: undefined,
          loanAvgUsdMax: undefined,
          loanAvgUsdMin: undefined,
          loanTotalUsdMax: undefined,
          loanTotalUsdMin: undefined
        },
        {
          skip: 0,
          limit: 10,
          sort: { by: 'ranking', direction: 'DESC' }
        }
      );
    });
  });

  describe(CollectionService.prototype.count.name, () => {
    it('delegates count query to repository with filters', async () => {
      const fnCount = jest.spyOn(collectionRepository, 'count').mockResolvedValue(42);

      const result = await service.count({
        ids: [1, 2],
        page: 2,
        limit: 5,
        contracts: ['0xabc'],
        whitelisted: false,
        loanTotalUsdMin: 1,
        loanTotalUsdMax: 10,
        loanAvgUsdMin: 2,
        loanAvgUsdMax: 3
      });

      expect(result).toBe(42);
      expect(fnCount).toHaveBeenCalledWith({
        ids: [1, 2],
        contracts: ['0xabc'],
        whitelisted: false,
        loanTotalUsdMin: 1,
        loanTotalUsdMax: 10,
        loanAvgUsdMin: 2,
        loanAvgUsdMax: 3
      });
    });
  });

  describe(CollectionService.prototype.toDtos.name, () => {
    it('maps collections with projected stats and always-null floor', async () => {
      const collectionA = buildCollectionEntity({ id: 1, contract: '0xabc', tokenRangeBegin: '1', tokenRangeEnd: '2' });
      const collectionB = buildCollectionEntity({ id: 2, contract: '0xdef', tokenRangeBegin: '3', tokenRangeEnd: '4' });
      const fnFloors = jest.spyOn(floorPriceService, 'getCollectionToPricePairs');
      const fnStats = jest.spyOn(collectionStatsRepository, 'findByIds').mockResolvedValue([
        {
          collectionId: 1,
          count: 10,
          totalUsd: 1000,
          averageUsd: 100,
          averageApr: 5,
          averageDuration: 30,
          marketPct: 50
        },
        { collectionId: 2, count: 1, totalUsd: 100, averageUsd: 100, averageApr: 10, averageDuration: 5, marketPct: 5 }
      ]);

      const dtos = await service.toDtos([collectionA, collectionB], {
        projection: [CollectionProjection.FloorPrice, CollectionProjection.Stats]
      });

      expect(dtos).toEqual([
        expect.objectContaining({
          id: 1,
          contract: '0xabc',
          floor: null,
          stats: {
            count: 10,
            totalUsd: 1000,
            averageUsd: 100,
            averageApr: 5,
            averageDuration: 30,
            marketPct: 50
          }
        }),
        expect.objectContaining({
          id: 2,
          contract: '0xdef',
          floor: null,
          stats: {
            count: 1,
            totalUsd: 100,
            averageUsd: 100,
            averageApr: 10,
            averageDuration: 5,
            marketPct: 5
          }
        })
      ]);
      expect(fnFloors).not.toHaveBeenCalled();
      expect(fnStats).toHaveBeenCalledWith([1, 2]);
    });

    it('fills zero stats when missing and keeps floor null', async () => {
      const collection = buildCollectionEntity({ id: 3, contract: '0xghi', tokenRangeBegin: '5', tokenRangeEnd: '6' });
      const fnFloors = jest.spyOn(floorPriceService, 'getCollectionToPricePairs');
      jest.spyOn(collectionStatsRepository, 'findByIds').mockResolvedValue([]);

      const [dto] = await service.toDtos([collection], {
        projection: [CollectionProjection.FloorPrice, CollectionProjection.Stats]
      });

      expect(dto.stats).toEqual({
        count: 0,
        totalUsd: 0,
        averageUsd: 0,
        averageApr: 0,
        averageDuration: 0,
        marketPct: 0
      });
      expect(dto.floor).toBeNull();
      expect(fnFloors).not.toHaveBeenCalled();
    });

    it('keeps floor null even when floor-price projection is requested', async () => {
      const collection = buildCollectionEntity({ id: 4, contract: '0xjkl', tokenRangeBegin: '7', tokenRangeEnd: '8' });
      const fnFloors = jest.spyOn(floorPriceService, 'getCollectionToPricePairs');
      jest.spyOn(collectionStatsRepository, 'findByIds').mockResolvedValue([]);

      const [dto] = await service.toDtos([collection], { projection: [CollectionProjection.FloorPrice] });

      expect(dto.floor).toBeNull();
      expect(fnFloors).not.toHaveBeenCalled();
    });

    it('skips expensive lookups when no projections requested', async () => {
      const collection = buildCollectionEntity({
        id: 5,
        contract: '0xmnop',
        tokenRangeBegin: '9',
        tokenRangeEnd: '10'
      });
      const fnFloors = jest.spyOn(floorPriceService, 'getCollectionToPricePairs');
      const fnStats = jest.spyOn(collectionStatsRepository, 'findByIds');

      const [dto] = await service.toDtos([collection], { projection: [] });

      expect(dto.floor).toBeNull();
      expect(dto.stats).toBeNull();
      expect(fnFloors).not.toHaveBeenCalled();
      expect(fnStats).not.toHaveBeenCalled();
    });

    it('handles empty collection list', async () => {
      const fnFloors = jest.spyOn(floorPriceService, 'getCollectionToPricePairs');
      const fnStats = jest.spyOn(collectionStatsRepository, 'findByIds');

      const dtos = await service.toDtos([], {
        projection: [CollectionProjection.FloorPrice, CollectionProjection.Stats]
      });

      expect(dtos).toEqual([]);
      expect(fnFloors).not.toHaveBeenCalled();
      expect(fnStats).not.toHaveBeenCalled();
    });
  });

  describe(CollectionService.prototype.validateAndRefreshLinks.name, () => {
    it('validates and refreshes project links', async () => {
      const projects = [
        buildCollectionEntity({
          id: 1,
          npfSlug: 'test-project',
          contract: '0xdadb0d80178819f2319190d340ce9a924f783711',
          imageUrl: ''
        })
      ];
      const fnGetImageUrl = jest
        .spyOn(metadataService, 'getImageUrl')
        .mockResolvedValue('https://example.com/image.png');
      const fnFind = jest
        .spyOn(collectionRepository, 'iterateOverNonEmptyImageEntries')
        .mockImplementation(async function* () {
          yield projects[0];
        });
      const fnUpdateById = jest.spyOn(collectionRepository, 'updateByIds').mockResolvedValue(null);
      const fnIsLinkValid = jest.spyOn(metadataService, 'isLinkValid').mockResolvedValue(false);

      const promise = service.validateAndRefreshLinks();
      await jest.advanceTimersByTimeAsync(100);
      await promise;

      expect(fnGetImageUrl).toHaveBeenCalledWith('0xdadb0d80178819f2319190d340ce9a924f783711', '1');
      expect(fnUpdateById).toHaveBeenCalledWith([1], {
        imageUrl: 'https://example.com/image.png'
      });
      expect(fnFind).toHaveBeenCalledWith();
      expect(fnIsLinkValid).toHaveBeenCalledWith('');
    });

    it('skips update if metadata is not found', async () => {
      const projects = [
        buildCollectionEntity({
          id: 1,
          npfSlug: 'test-project',
          contract: '0xdadb0d80178819f2319190d340ce9a924f783711',
          imageUrl: ''
        }),
        buildCollectionEntity({
          id: 2,
          npfSlug: 'another-project',
          contract: '0xabcdef1234567890abcdef1234567890abcdef12',
          imageUrl: 'https://example.com/another-image.png'
        })
      ];
      const fnGetImageUrl = jest.spyOn(metadataService, 'getImageUrl').mockResolvedValue('');
      const fnFind = jest
        .spyOn(collectionRepository, 'iterateOverNonEmptyImageEntries')
        .mockImplementation(async function* () {
          yield projects[0];
          yield projects[1];
        });
      const fnUpdateByIds = jest.spyOn(collectionRepository, 'updateByIds').mockResolvedValue(null);
      const fnIsLinkValid = jest
        .spyOn(metadataService, 'isLinkValid')
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const promise = service.validateAndRefreshLinks();
      await jest.advanceTimersByTimeAsync(200);
      await promise;

      expect(fnGetImageUrl).toHaveBeenCalledWith('0xdadb0d80178819f2319190d340ce9a924f783711', '1');
      expect(fnUpdateByIds).not.toHaveBeenCalled();
      expect(fnFind).toHaveBeenCalledWith();
      expect(fnIsLinkValid).toHaveBeenCalled();
    });

    it('skips refresh when image link is valid', async () => {
      const collections = [
        buildCollectionEntity({
          id: 1,
          contract: '0x123',
          imageUrl: 'https://example.com/image.png',
          tokenRangeBegin: '1',
          tokenRangeEnd: '2'
        })
      ];
      const fnIterate = jest
        .spyOn(collectionRepository, 'iterateOverNonEmptyImageEntries')
        .mockImplementation(async function* () {
          yield collections[0];
        });
      const fnGetImageUrl = jest.spyOn(metadataService, 'getImageUrl');
      const fnUpdateByIds = jest.spyOn(collectionRepository, 'updateByIds');
      const fnIsLinkValid = jest.spyOn(metadataService, 'isLinkValid').mockResolvedValue(true);

      const promise = service.validateAndRefreshLinks();
      await jest.advanceTimersByTimeAsync(100);
      await promise;

      expect(fnIterate).toHaveBeenCalledWith();
      expect(fnIsLinkValid).toHaveBeenCalledWith('https://example.com/image.png');
      expect(fnGetImageUrl).not.toHaveBeenCalled();
      expect(fnUpdateByIds).not.toHaveBeenCalled();
    });
  });

  describe(CollectionService.prototype.updateMissingImageUrls.name, () => {
    it('updates image urls for all collections', async () => {
      const collections = [
        buildCollectionEntity({
          id: 1,
          contract: '0x1234567890abcdef1234567890abcdef12345678',
          imageUrl: '',
          tokenRangeBegin: '1',
          tokenRangeEnd: '999'
        }),
        buildCollectionEntity({
          id: 2,
          contract: '0xabcdef1234567890abcdef1234567890abcdef12',
          imageUrl: '',
          tokenRangeBegin: '1000',
          tokenRangeEnd: '5000'
        })
      ];
      const fnIterate = jest
        .spyOn(collectionRepository, 'iterateOverEmptyImageEntries')
        .mockImplementation(async function* () {
          yield collections[0];
          yield collections[1];
        });
      const fnGetImageUrl = jest
        .spyOn(metadataService, 'resolveMissingImageUrl')
        .mockResolvedValue('https://example.com/image.png');
      const fnUpdateByIds = jest.spyOn(collectionRepository, 'updateByIds').mockResolvedValue(null);
      await service.updateMissingImageUrls();

      expect(fnIterate).toHaveBeenCalledWith();
      expect(fnGetImageUrl).toHaveBeenCalledWith('0x1234567890abcdef1234567890abcdef12345678', '1');
      expect(fnUpdateByIds).toHaveBeenCalledWith([1], {
        imageUrl: 'https://example.com/image.png'
      });
      expect(fnGetImageUrl).toHaveBeenCalledWith('0xabcdef1234567890abcdef1234567890abcdef12', '1000');
      expect(fnUpdateByIds).toHaveBeenCalledWith([2], {
        imageUrl: 'https://example.com/image.png'
      });
    });

    it('skips update if metadata has not been changed', async () => {
      const collections = [
        buildCollectionEntity({
          id: 1,
          contract: '0x1234567890abcdef1234567890abcdef12345678',
          name: 'Test Collection',
          imageUrl: '',
          tokenRangeBegin: '1',
          tokenRangeEnd: '2'
        })
      ];
      const fnIterate = jest
        .spyOn(collectionRepository, 'iterateOverEmptyImageEntries')
        .mockImplementation(async function* () {
          yield collections[0];
        });
      const fnUpdateByIds = jest.spyOn(collectionRepository, 'updateByIds');
      const fnGetMetadata = jest.spyOn(metadataService, 'resolveMissingImageUrl').mockResolvedValue('');

      await service.updateMissingImageUrls();

      expect(fnIterate).toHaveBeenCalledWith();
      expect(fnGetMetadata).toHaveBeenCalledWith('0x1234567890abcdef1234567890abcdef12345678', '1');
      expect(fnUpdateByIds).not.toHaveBeenCalled();
    });
  });

  describe(CollectionService.prototype.updateMissingNpfSlugs.name, () => {
    it('updates missing npf slugs when metadata service returns a value', async () => {
      const collection = buildCollectionEntity({
        id: 9,
        contract: '0x1234567890abcdef1234567890abcdef12345678',
        tokenRangeBegin: '1',
        npfSlug: null
      });
      const fnIterate = jest
        .spyOn(collectionRepository, 'iterateOverEntriesWithEmptyNpfSlug')
        .mockImplementation(async function* () {
          yield collection;
        });
      const fnGetNpfSlug = jest.spyOn(metadataService, 'getNpfSlug').mockResolvedValue('cool-cats');
      const fnUpdate = jest.spyOn(collectionRepository, 'updateByIds').mockResolvedValue(null);

      await service.updateMissingNpfSlugs();

      expect(fnIterate).toHaveBeenCalledWith();
      expect(fnGetNpfSlug).toHaveBeenCalledWith(collection.contract, collection.tokenRangeBegin);
      expect(fnUpdate).toHaveBeenCalledWith([collection.id], { npfSlug: 'cool-cats' });
    });

    it('skips update when metadata service returns empty npf slug', async () => {
      const collection = buildCollectionEntity({
        id: 10,
        contract: '0xabcdef1234567890abcdef1234567890abcdef12',
        tokenRangeBegin: '100',
        npfSlug: null
      });
      const fnIterate = jest
        .spyOn(collectionRepository, 'iterateOverEntriesWithEmptyNpfSlug')
        .mockImplementation(async function* () {
          yield collection;
        });
      const fnGetNpfSlug = jest.spyOn(metadataService, 'getNpfSlug').mockResolvedValue('');
      const fnUpdate = jest.spyOn(collectionRepository, 'updateByIds');

      await service.updateMissingNpfSlugs();

      expect(fnIterate).toHaveBeenCalledWith();
      expect(fnGetNpfSlug).toHaveBeenCalledWith(collection.contract, collection.tokenRangeBegin);
      expect(fnUpdate).not.toHaveBeenCalled();
    });
  });

  describe(CollectionService.prototype.updateAllRankings.name, () => {
    it('iterates collections in batches and updates rankings', async () => {
      const batchOne = [buildCollectionEntity({ id: 1 })];
      const batchTwo = [buildCollectionEntity({ id: 2 }), buildCollectionEntity({ id: 3 })];
      const fnIterate = jest.spyOn(collectionRepository, 'iterate').mockImplementation(async function* () {
        yield batchOne[0];
        yield batchTwo[0];
        yield batchTwo[1];
      });
      const fnUpdateRankings = jest.spyOn(service, 'updateRankings').mockResolvedValue();

      await service.updateAllRankings();

      expect(fnIterate).toHaveBeenCalledWith({}, {});
      expect(fnUpdateRankings).toHaveBeenCalledWith([batchOne[0]]);
      expect(fnUpdateRankings).toHaveBeenCalledWith([batchTwo[0]]);
      expect(fnUpdateRankings).toHaveBeenCalledWith([batchTwo[1]]);
      expect(fnUpdateRankings).toHaveBeenCalledTimes(3);
    });
  });

  describe(CollectionService.prototype.updateRankings.name, () => {
    it('updates rankings using floored totalUsd values', async () => {
      const collectionA = buildCollectionEntity({ id: 1 });
      const collectionB = buildCollectionEntity({ id: 2 });
      const fnFindStats = jest.spyOn(collectionStatsRepository, 'findByIds').mockResolvedValue([
        {
          collectionId: 1,
          totalUsd: 123.45,
          averageApr: 0,
          averageDuration: 0,
          averageUsd: 0,
          count: 0,
          marketPct: 0
        }
      ]);
      const fnUpdate = jest.spyOn(collectionRepository, 'updateByIds').mockResolvedValue(null);

      await service.updateRankings([collectionA, collectionB]);

      expect(fnFindStats).toHaveBeenCalledWith([1, 2]);
      expect(fnUpdate).toHaveBeenNthCalledWith(1, [1], { ranking: 123 });
      expect(fnUpdate).toHaveBeenNthCalledWith(2, [2], { ranking: 0 });
    });
  });

  describe(CollectionService.prototype.toDto.name, () => {
    it('converts collection to DTO', async () => {
      const collection = buildCollectionEntity({ contract: '0x1234567890abcdef1234567890abcdef12345678' });

      const result = await service.toDto(collection, { projection: [] });

      expect(result).toEqual({
        id: 1,
        contract: '0x1234567890abcdef1234567890abcdef12345678',
        imageUrl: 'https://example.com/collection-image.png',
        name: 'Collection Name',
        ranking: 1,
        whitelisted: true,
        openseaSlug: 'opensea',
        tokenRange: '1:2',
        tokenSupply: '2',
        tokenStandard: TokenStandard.ERC721,
        floor: null,
        stats: null
      });
    });

    it("calculates token supply for 'any' colleciton range", async () => {
      const collection = buildCollectionEntity({
        contract: '0x1234567890abcdef1234567890abcdef12345678',
        tokenRangeBegin: '0',
        tokenRangeEnd: '115792088493877430895360021923396096490996206463347729233768112118952114559549'
      });

      const result = await service.toDto(collection, { projection: [] });

      expect(result).toEqual({
        id: 1,
        contract: '0x1234567890abcdef1234567890abcdef12345678',
        imageUrl: 'https://example.com/collection-image.png',
        name: 'Collection Name',
        ranking: 1,
        whitelisted: true,
        openseaSlug: 'opensea',
        tokenRange: '0:115792088493877430895360021923396096490996206463347729233768112118952114559549',
        tokenSupply: '115792088493877430895360021923396096490996206463347729233768112118952114559550',
        tokenStandard: TokenStandard.ERC721,
        floor: null,
        stats: null
      });
    });
  });

  describe(CollectionService.prototype.updateTokenRanges.name, () => {
    it('updates collection token range when matching range is found', async () => {
      const collections = [
        buildCollectionEntity({
          id: 1,
          contract: '0x1234567890abcdef1234567890abcdef12345678',
          tokenRangeBegin: '1001',
          tokenRangeEnd: '1001',
          openseaSlug: 'opensea',
          npfSlug: 'npf',
          name: 'Test Collection',
          imageUrl: 'https://example.com/collection-image.png'
        })
      ];
      const fnIterate = jest.spyOn(collectionRepository, 'iterate').mockImplementation(async function* () {
        yield collections[0];
      });
      const fnGetSlugsAndRanges = jest
        .spyOn(metadataService, 'getSlugsAndRanges')
        .mockResolvedValue({ opensea: ['1', '1000'], openlake: ['1001', '2000'] });

      await service.updateTokenRanges();

      expect(fnIterate).toHaveBeenCalledWith({}, {});
      expect(fnGetSlugsAndRanges).toHaveBeenCalledWith('0x1234567890abcdef1234567890abcdef12345678');

      expect(collectionRepository.updateByIds).toHaveBeenCalledWith([1], {
        tokenRangeBegin: '1001',
        tokenRangeEnd: '2000'
      });
    });

    it('skips collections where getSlugsAndRanges is throwing errors', async () => {
      const collections = [
        buildCollectionEntity({
          id: 1,
          contract: '0x1234567890abcdef1234567890abcdef12345678',
          tokenRangeBegin: '1',
          tokenRangeEnd: '10',
          openseaSlug: 'opensea',
          npfSlug: 'npf',
          name: 'Test Collection',
          imageUrl: 'https://example.com/collection-image.png'
        })
      ];
      const fnIterate = jest.spyOn(collectionRepository, 'iterate').mockImplementation(async function* () {
        yield collections[0];
      });
      const fnGetSlugsAndRanges = jest
        .spyOn(metadataService, 'getSlugsAndRanges')
        .mockRejectedValue(new Error('Test Error'));

      await service.updateTokenRanges();

      expect(fnIterate).toHaveBeenCalledWith({}, {});
      expect(fnGetSlugsAndRanges).toHaveBeenCalledWith('0x1234567890abcdef1234567890abcdef12345678');

      expect(collectionRepository.updateByIds).not.toHaveBeenCalled();
    });

    it('skips collections when no range matches the tokenId', async () => {
      const collections = [
        buildCollectionEntity({
          id: 1,
          contract: '0x1234567890abcdef1234567890abcdef12345678',
          tokenRangeBegin: '1',
          tokenRangeEnd: '10',
          openseaSlug: 'opensea',
          npfSlug: 'npf',
          name: 'Test Collection',
          imageUrl: 'https://example.com/collection-image.png'
        })
      ];
      const fnIterate = jest.spyOn(collectionRepository, 'iterate').mockImplementation(async function* () {
        yield collections[0];
      });
      const fnGetSlugsAndRanges = jest
        .spyOn(metadataService, 'getSlugsAndRanges')
        .mockResolvedValue({ opensea: ['11', '1000'] });
      const fnUpdate = jest.spyOn(collectionRepository, 'updateByIds');

      await service.updateTokenRanges();

      expect(fnIterate).toHaveBeenCalledWith({}, {});
      expect(fnGetSlugsAndRanges).toHaveBeenCalledWith('0x1234567890abcdef1234567890abcdef12345678');
      expect(fnUpdate).not.toHaveBeenCalled();
    });
  });
});
