import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Collection,
  CollectionRepository,
  CollectionStats,
  CollectionStatsRepository
} from '@nftfi.api/repositories/postgres/collection';
import {
  CollectionFloorPrice,
  CollectionFloorPriceRepository
} from '@nftfi.api/repositories/postgres/collection-floor-price';
import { CollectionService } from './collection.service';
import { CollectionMetadataService } from './collection-metadata.service';
import { CollectionController } from './collection.controller';
import { CollectionV1Controller } from './collection-v1.controller';
import { CollectionScheduler } from './collection.scheduler';
import { CollectionFloorPriceService } from './collection-floor-price.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Collection, CollectionStats, CollectionFloorPrice])],
  controllers: [CollectionController, CollectionV1Controller],
  providers: [
    CollectionService,
    CollectionMetadataService,
    CollectionFloorPriceService,
    CollectionRepository,
    CollectionStatsRepository,
    CollectionFloorPriceRepository,
    CollectionScheduler
  ],
  exports: [CollectionService]
})
export class CollectionModule {}
