import { CollectionAsset } from '@nftfi.api/repositories/postgres/collection-asset';

export type AssetLinks = Pick<CollectionAsset, 'imageMediumUrl' | 'imageSmallUrl'>;

export type AssetMetadata = Partial<Pick<CollectionAsset, 'name'> & AssetLinks>;
