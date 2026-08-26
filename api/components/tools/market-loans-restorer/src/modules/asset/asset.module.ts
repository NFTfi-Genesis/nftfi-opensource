import { DynamicModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectionAsset, CollectionAssetRepository } from '@nftfi.api/repositories/postgres/collection-asset';
import { Collection } from '@nftfi.api/repositories/postgres/collection';
import { AssetsFacade } from '@nftfi.api/facades/assets';
import { AssetsMockFacade } from './asset-mock.facade';
import { AssetMockConfigToken, AssetModuleOptions } from './asset.types';

export class AssetModule {
  static forRoot(options: AssetModuleOptions): DynamicModule {
    return {
      module: AssetModule,
      global: true,
      imports: [TypeOrmModule.forFeature([Collection, CollectionAsset])],
      providers: [
        CollectionAssetRepository,
        AssetsMockFacade,
        { provide: AssetsFacade, useExisting: AssetsMockFacade },
        { provide: AssetMockConfigToken, useValue: options }
      ],
      exports: [AssetsFacade]
    };
  }
}
