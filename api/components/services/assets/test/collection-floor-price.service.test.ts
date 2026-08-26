import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Collection, CollectionRepository } from '@nftfi.api/repositories/postgres/collection';
import {
  CollectionFloorPrice,
  CollectionFloorPriceRepository
} from '@nftfi.api/repositories/postgres/collection-floor-price';
import { NftPriceFloorFacade, NftPriceFloorNotFoundError } from '@nftfi.api/facades/nft-price-floor';
import { FxRatesFacade } from '@nftfi.api/facades/fx-rates';
import { buildCollectionEntity } from '@nftfi.api/repositories/postgres/factories/collection';
import { CollectionFloorPriceService } from '../src/collection/collection-floor-price.service';

const buildFloorPrice = (overrides: Partial<CollectionFloorPrice> = {}): CollectionFloorPrice => ({
  id: 1,
  collection: buildCollectionEntity({ id: 1 }) as Collection,
  valueEth: 1,
  valueUsd: 2000,
  createdAt: new Date('2023-01-01T00:00:00.000Z'),
  updatedAt: new Date('2023-01-01T00:00:00.000Z'),
  ...overrides
});

describe(CollectionFloorPriceService.name, () => {
  let service: CollectionFloorPriceService;
  let configService: ConfigService;
  let npfFacade: NftPriceFloorFacade;
  let floorPriceRepository: CollectionFloorPriceRepository;
  let collectionRepository: CollectionRepository;
  let fxRatesFacade: FxRatesFacade;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => void 0);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => void 0);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => void 0);

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-01-01T00:00:00.000Z'));
  });

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [
            (): object => ({
              npf: {
                historicalEnabled: true
              }
            })
          ]
        })
      ],
      providers: [
        CollectionFloorPriceService,
        {
          provide: NftPriceFloorFacade,
          useValue: {
            getDetails: jest.fn(),
            getHistoricalPrices: jest.fn()
          }
        },
        {
          provide: CollectionFloorPriceRepository,
          useValue: {
            create: jest.fn(),
            findLatestByCollectionId: jest.fn(),
            findLatestByCollectionIds: jest.fn()
          }
        },
        {
          provide: CollectionRepository,
          useValue: {
            iterateOverEntriesWithNpfSlug: jest.fn(),
            updateByIds: jest.fn()
          }
        },
        {
          provide: FxRatesFacade,
          useValue: {
            getRateAtDate: jest.fn()
          }
        }
      ]
    }).compile();

    service = moduleRef.get(CollectionFloorPriceService);
    configService = moduleRef.get(ConfigService);
    npfFacade = moduleRef.get(NftPriceFloorFacade);
    floorPriceRepository = moduleRef.get(CollectionFloorPriceRepository);
    collectionRepository = moduleRef.get(CollectionRepository);
    fxRatesFacade = moduleRef.get(FxRatesFacade);
  });

  describe(CollectionFloorPriceService.prototype.refreshAll.name, () => {
    it('refreshes each collection using latest saved price date', async () => {
      const c1 = buildCollectionEntity({ id: 1, npfSlug: 'slug-1' });
      const c2 = buildCollectionEntity({ id: 2, npfSlug: 'slug-2' });
      jest.spyOn(collectionRepository, 'iterateOverEntriesWithNpfSlug').mockImplementation(async function* () {
        yield c1;
        yield c2;
      });
      jest
        .spyOn(floorPriceRepository, 'findLatestByCollectionId')
        .mockResolvedValueOnce(buildFloorPrice({ collection: c1 as Collection, createdAt: new Date('2022-12-01') }))
        .mockResolvedValueOnce(null);
      const fnRefreshCollection = jest.spyOn(service, 'refreshCollection').mockResolvedValue();

      await service.refreshAll();

      expect(floorPriceRepository.findLatestByCollectionId).toHaveBeenCalledWith(1);
      expect(floorPriceRepository.findLatestByCollectionId).toHaveBeenCalledWith(2);
      expect(fnRefreshCollection).toHaveBeenNthCalledWith(1, c1, new Date('2022-12-01T00:00:00.000Z'));
      expect(fnRefreshCollection).toHaveBeenNthCalledWith(2, c2, undefined);
    });
  });

  describe(CollectionFloorPriceService.prototype.refreshCollection.name, () => {
    it('skips when npf slug is missing', async () => {
      const collection = buildCollectionEntity({ id: 10, npfSlug: null });
      const fnUpdateActual = jest.spyOn(service, 'updateActualValue').mockResolvedValue();
      const fnUpdateHistorical = jest.spyOn(service, 'updateHistoricalValues').mockResolvedValue();

      await service.refreshCollection(collection);

      expect(fnUpdateActual).not.toHaveBeenCalled();
      expect(fnUpdateHistorical).not.toHaveBeenCalled();
    });

    it('updates actual value when last update is recent', async () => {
      const collection = buildCollectionEntity({ id: 11, npfSlug: 'slug-11' });
      const fnUpdateActual = jest.spyOn(service, 'updateActualValue').mockResolvedValue();
      const fnUpdateHistorical = jest.spyOn(service, 'updateHistoricalValues').mockResolvedValue();

      await service.refreshCollection(collection, new Date('2022-12-31T12:00:00.000Z'));

      expect(fnUpdateActual).toHaveBeenCalledWith(collection);
      expect(fnUpdateHistorical).not.toHaveBeenCalled();
    });

    it('updates actual value when historical updates are disabled', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'npf.historicalEnabled') return false;
        return undefined;
      });
      const collection = buildCollectionEntity({ id: 12, npfSlug: 'slug-12', releasedAt: new Date('2021-01-01') });
      const fnUpdateActual = jest.spyOn(service, 'updateActualValue').mockResolvedValue();
      const fnUpdateHistorical = jest.spyOn(service, 'updateHistoricalValues').mockResolvedValue();

      await service.refreshCollection(collection);

      expect(fnUpdateActual).toHaveBeenCalledWith(collection);
      expect(fnUpdateHistorical).not.toHaveBeenCalled();
    });

    it('updates historical values when data is stale and history is enabled', async () => {
      const collection = buildCollectionEntity({ id: 13, npfSlug: 'slug-13', releasedAt: new Date('2021-01-01') });
      const fnUpdateActual = jest.spyOn(service, 'updateActualValue').mockResolvedValue();
      const fnUpdateHistorical = jest.spyOn(service, 'updateHistoricalValues').mockResolvedValue();

      await service.refreshCollection(collection);

      expect(fnUpdateActual).not.toHaveBeenCalled();
      expect(fnUpdateHistorical).toHaveBeenCalledWith(collection, undefined);
    });

    it('swallows errors and logs them', async () => {
      const collection = buildCollectionEntity({ id: 14, npfSlug: 'slug-14' });
      jest.spyOn(service, 'updateActualValue').mockRejectedValue(new Error('boom'));

      await expect(
        service.refreshCollection(collection, new Date('2022-12-31T12:00:00.000Z'))
      ).resolves.toBeUndefined();
    });
  });

  describe(CollectionFloorPriceService.prototype.updateActualValue.name, () => {
    it('saves actual floor price with usd value using fx rate', async () => {
      const collection = buildCollectionEntity({ id: 20, npfSlug: 'slug-20' });
      jest.spyOn(npfFacade, 'getDetails').mockResolvedValue({
        details: {
          floorInfo: {
            currentFloorNative: 5.1,
            latestFloorTs: 1672551200000
          }
        }
      } as never);
      jest.spyOn(fxRatesFacade, 'getRateAtDate').mockResolvedValue(2000);
      const fnCreate = jest.spyOn(floorPriceRepository, 'create').mockResolvedValue([]);

      await service.updateActualValue(collection);

      expect(fnCreate).toHaveBeenCalledWith([
        {
          collection,
          valueEth: 5.1,
          valueUsd: 10200,
          createdAt: new Date('2023-01-01T05:33:20.000Z')
        }
      ]);
    });
  });

  describe(CollectionFloorPriceService.prototype.updateHistoricalValues.name, () => {
    it('loads historical prices and persists normalized entries', async () => {
      const collection = buildCollectionEntity({ id: 21, npfSlug: 'slug-21', releasedAt: new Date('2022-01-01') });
      const fnHistorical = jest
        .spyOn(npfFacade, 'getHistoricalPrices')
        .mockResolvedValueOnce([
          { lowestNative: 1, timestamp: 1640995200000000 },
          { lowestNative: 2, timestamp: 1643673600000000 }
        ] as never)
        .mockResolvedValueOnce([]);
      jest.spyOn(fxRatesFacade, 'getRateAtDate').mockResolvedValueOnce(1000).mockResolvedValueOnce(1500);
      const fnCreate = jest.spyOn(floorPriceRepository, 'create').mockResolvedValue([]);

      await service.updateHistoricalValues(collection);

      expect(fnHistorical).toHaveBeenCalledWith('slug-21', {
        start: new Date('2022-01-01T00:00:00.000Z'),
        end: new Date('2023-01-01T00:00:00.000Z')
      });
      expect(fnCreate).toHaveBeenCalledWith([
        {
          collection,
          valueEth: 1,
          valueUsd: 1000,
          createdAt: new Date('2022-01-01T00:00:00.000Z')
        },
        {
          collection,
          valueEth: 2,
          valueUsd: 3000,
          createdAt: new Date('2022-02-01T00:00:00.000Z')
        }
      ]);
    });

    it('stops loop when no historical data is returned', async () => {
      const collection = buildCollectionEntity({ id: 22, npfSlug: 'slug-22', releasedAt: new Date('2022-01-01') });
      const fnHistorical = jest.spyOn(npfFacade, 'getHistoricalPrices').mockResolvedValueOnce([]);
      const fnCreate = jest.spyOn(floorPriceRepository, 'create').mockResolvedValue([]);

      await service.updateHistoricalValues(collection);

      expect(fnHistorical).toHaveBeenCalledTimes(1);
      expect(fnCreate).not.toHaveBeenCalled();
    });
  });

  describe(CollectionFloorPriceService.prototype.wrapCall.name, () => {
    it('disables npf slug when project is not found', async () => {
      const collection = buildCollectionEntity({ id: 30, npfSlug: 'slug-30' });
      const fnUpdate = jest.spyOn(collectionRepository, 'updateByIds').mockResolvedValue();

      const result = await service.wrapCall(collection, Promise.reject(new NftPriceFloorNotFoundError('missing')));

      expect(result).toBeUndefined();
      expect(fnUpdate).toHaveBeenCalledWith([30], { npfSlug: null });
    });

    it('rethrows unknown errors', async () => {
      const collection = buildCollectionEntity({ id: 31, npfSlug: 'slug-31' });

      await expect(service.wrapCall(collection, Promise.reject(new Error('unknown')))).rejects.toThrow('unknown');
    });
  });

  describe(CollectionFloorPriceService.prototype.getCollectionPrice.name, () => {
    it('returns zero values when no floor price exists', async () => {
      jest.spyOn(floorPriceRepository, 'findLatestByCollectionId').mockResolvedValue(null);

      const result = await service.getCollectionPrice(buildCollectionEntity({ id: 40 }));

      expect(result).toEqual({ valueEth: 0, valueUsd: 0 });
      expect(floorPriceRepository.findLatestByCollectionId).toHaveBeenCalledWith(40);
    });

    it('returns latest stored values when floor price exists', async () => {
      jest
        .spyOn(floorPriceRepository, 'findLatestByCollectionId')
        .mockResolvedValue(
          buildFloorPrice({ collection: buildCollectionEntity({ id: 41 }) as Collection, valueEth: 3, valueUsd: 9000 })
        );

      const result = await service.getCollectionPrice(buildCollectionEntity({ id: 41 }));

      expect(result).toEqual({ valueEth: 3, valueUsd: 9000 });
      expect(floorPriceRepository.findLatestByCollectionId).toHaveBeenCalledWith(41);
    });
  });

  describe(CollectionFloorPriceService.prototype.getCollectionToPricePairs.name, () => {
    it('returns pairs for collections with available latest prices', async () => {
      const c1 = buildCollectionEntity({ id: 50 });
      const c2 = buildCollectionEntity({ id: 51 });
      jest
        .spyOn(floorPriceRepository, 'findLatestByCollectionIds')
        .mockResolvedValue([buildFloorPrice({ collection: c2 as Collection, valueEth: 7, valueUsd: 14000 })]);

      const result = await service.getCollectionToPricePairs([c1, c2]);

      expect(floorPriceRepository.findLatestByCollectionIds).toHaveBeenCalledWith([50, 51]);
      expect(result).toEqual({
        '50': { valueEth: 0, valueUsd: 0 },
        '51': { valueEth: 7, valueUsd: 14000 }
      });
    });

    it('falls back to zero values when latest price fields are undefined', async () => {
      const c1 = buildCollectionEntity({ id: 52 });
      jest
        .spyOn(floorPriceRepository, 'findLatestByCollectionIds')
        .mockResolvedValue([
          buildFloorPrice({ collection: c1 as Collection, valueEth: undefined as never, valueUsd: undefined as never })
        ]);

      const result = await service.getCollectionToPricePairs([c1]);

      expect(result).toEqual({
        52: { valueEth: 0, valueUsd: 0 }
      });
    });
  });
});
