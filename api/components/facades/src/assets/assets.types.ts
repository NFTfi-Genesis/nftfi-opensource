export enum AssetsQueueTopic {
  GetAssets = 'assets_get',
  GetAssetByKey = 'assets_get-by-key',
  CreateAsset = 'assets_create',
  GetCollections = 'collections_get',
  GetCollectionByKey = 'collections_get-by-key',
  GetCollectionsByContract = 'collections_get-by-contract'
}

export enum AssetProjection {
  CollectionStats = 'collection.stats',
  CollectionFloorPrice = 'collection.floor-price'
}

export enum CollectionProjection {
  Stats = 'stats',
  FloorPrice = 'floor-price'
}
