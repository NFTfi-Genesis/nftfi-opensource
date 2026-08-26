import { Collection } from '../collection';
import { CollectionAsset } from './collection-asset.entity';

export const COLLECTION_ASSET_TABLE_NAME = 'collection_assets';

export type CollectionAssetDraft = Pick<
  CollectionAsset,
  'contract' | 'tokenId' | 'name' | 'imageMediumUrl' | 'imageSmallUrl'
> & {
  collection: Pick<Collection, 'id'>;
};

export type CollectionAssetUpdatePayload = Pick<
  CollectionAsset,
  'name' | 'imageSmallUrl' | 'imageMediumUrl' | 'collection'
>;

export type AssetKey = Pick<CollectionAsset, 'contract' | 'tokenId'>;

export type FindFilters = AssetKey | AssetKey[] | {};
