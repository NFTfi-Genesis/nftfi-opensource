import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectionAsset, CollectionAssetRepository } from '@nftfi.api/repositories/postgres/collection-asset';
import { AssetService } from './asset.service';
import { AssetController } from './asset.controller';
import { AssetV1Controller } from './asset-v1.controller';
import { AssetMetadataService } from './asset-metadata.service';
import { AssetScheduler } from './asset.scheduler';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([CollectionAsset])],
  controllers: [AssetController, AssetV1Controller],
  providers: [AssetService, AssetMetadataService, CollectionAssetRepository, AssetScheduler]
})
export class AssetModule {}
