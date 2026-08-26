import { Injectable, Logger } from '@nestjs/common';
import { addYears, differenceInHours, startOfDay } from 'date-fns';
import { ConfigService } from '@nestjs/config';
import { Collection, CollectionRepository } from '@nftfi.api/repositories/postgres/collection';
import {
  CollectionFloorPrice,
  CollectionFloorPriceRepository
} from '@nftfi.api/repositories/postgres/collection-floor-price';
import { NftPriceFloorFacade, NftPriceFloorNotFoundError } from '@nftfi.api/facades/nft-price-floor';
import { FxRatesFacade } from '@nftfi.api/facades/fx-rates';

const COLLECTION_FLOOR_PRICES_UPDATE_THRESHOLD_HOURS = 24;
type CollectionFloorPricePair = Pick<CollectionFloorPrice, 'valueEth' | 'valueUsd'>;

@Injectable()
export class CollectionFloorPriceService {
  private readonly logger = new Logger(CollectionFloorPriceService.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly npfFacade: NftPriceFloorFacade,
    private readonly floorPriceRepository: CollectionFloorPriceRepository,
    private readonly collectionRepository: CollectionRepository,
    private readonly fxRatesFacade: FxRatesFacade
  ) {}

  async refreshAll(): Promise<void> {
    for await (const collection of this.collectionRepository.iterateOverEntriesWithNpfSlug()) {
      const price = await this.floorPriceRepository.findLatestByCollectionId(collection.id);

      await this.refreshCollection(collection, price?.createdAt);
      this.logger.log(`Updated floor price for collections: ${collection.npfSlug}`);
    }
  }

  async refreshCollection(collection: Collection, startDate?: Date): Promise<void> {
    try {
      if (!collection.npfSlug) {
        return this.logger.warn(
          `Skipping floor prices update for collection ${collection.contract}(id=${collection.id}) due to missing npfSlug`
        );
      }

      const lastUpdatedAt = startDate || collection.releasedAt;
      const lastUpdateDiff = differenceInHours(new Date(), lastUpdatedAt);
      const isHistoricalUpdateEnabled = this.configService.get<boolean>('npf.historicalEnabled');
      let isActualValueUpdate = lastUpdateDiff < COLLECTION_FLOOR_PRICES_UPDATE_THRESHOLD_HOURS;
      if (!isActualValueUpdate && !isHistoricalUpdateEnabled) {
        isActualValueUpdate = true;
        this.logger.log(
          `Historical prices update is disabled, updating only actual value for collection ${collection.contract}(id=${collection.id})`
        );
      }
      if (isActualValueUpdate) {
        return await this.updateActualValue(collection);
      }

      await this.updateHistoricalValues(collection, startDate);
    } catch (err) {
      this.logger.error(
        `Failed to update historical prices for collection ${collection.contract}(id=${collection.id}): ${err.message}`
      );
    }
  }

  async updateActualValue(collection: Collection): Promise<void> {
    const project = await this.wrapCall(collection, this.npfFacade.getDetails(collection.npfSlug));
    const createdAt = new Date(project.details.floorInfo.latestFloorTs);
    const rate = await this.fxRatesFacade.getRateAtDate(createdAt);
    await this.floorPriceRepository.create([
      {
        collection,
        valueEth: project.details.floorInfo.currentFloorNative,
        valueUsd: project.details.floorInfo.currentFloorNative * rate,
        createdAt
      }
    ]);
  }

  async updateHistoricalValues(collection: Collection, startDate?: Date): Promise<void> {
    const startOfToday = startOfDay(new Date());

    let chunkStartDate = startDate || collection.releasedAt;

    while (chunkStartDate < startOfToday) {
      let chunkEndDate = addYears(chunkStartDate, 1);

      const data = await this.wrapCall(
        collection,
        this.npfFacade.getHistoricalPrices(collection.npfSlug, {
          start: chunkStartDate,
          end: chunkEndDate
        })
      );

      if (!data.length) break;
      chunkStartDate = chunkEndDate;

      const entries = await Promise.all(
        data.map(async price => {
          const createdAt = new Date(price.timestamp / 1000);
          const rate = await this.fxRatesFacade.getRateAtDate(createdAt);
          return {
            collection,
            valueEth: price.lowestNative,
            valueUsd: price.lowestNative * rate,
            createdAt
          };
        })
      );

      await this.floorPriceRepository.create(entries);
    }
  }

  async wrapCall<T>(collection: Collection, promise: Promise<T>): Promise<T> {
    try {
      return await promise;
    } catch (err) {
      if (err instanceof NftPriceFloorNotFoundError) {
        this.logger.warn(`Project ${collection.npfSlug}(id=${collection.id}) not found in NftPriceFloor`);
        this.logger.warn(`Disabling project ${collection.npfSlug} due to missing historical prices`);
        await this.collectionRepository.updateByIds([collection.id], { npfSlug: null });
        return;
      }

      throw err;
    }
  }

  async getCollectionPrice(collection: Collection): Promise<CollectionFloorPricePair> {
    const latestPrice = await this.floorPriceRepository.findLatestByCollectionId(collection.id);
    return {
      valueEth: latestPrice?.valueEth || 0,
      valueUsd: latestPrice?.valueUsd || 0
    };
  }

  async getCollectionToPricePairs(collections: Collection[]): Promise<Record<number, CollectionFloorPricePair>> {
    const prices = await this.floorPriceRepository.findLatestByCollectionIds(collections.map(c => c.id));
    const result = collections.reduce<Record<number, CollectionFloorPricePair>>((acc, c) => {
      const price = prices.find(p => p.collection.id === c.id);
      return {
        ...acc,
        [c.id]: { valueEth: price?.valueEth || 0, valueUsd: price?.valueUsd || 0 }
      };
    }, {});

    return result;
  }
}
