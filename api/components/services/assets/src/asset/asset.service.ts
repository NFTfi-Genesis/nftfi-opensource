import { first, isBoolean, isEqual, isNil, pick } from 'lodash';
import { Injectable, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Mutex } from '@nftfi.api/core';
import { CollectionAsset, CollectionAssetRepository } from '@nftfi.api/repositories/postgres/collection-asset';
import { TokenStandard } from '@nftfi.api/repositories/postgres/collection';
import { AlchemyFacade } from '@nftfi.api/facades/alchemy';
import {
  AssetDto,
  AssetProjection,
  AssetsFacade,
  CollectionProjection,
  GetAssetArrayQueryDto
} from '@nftfi.api/facades/assets';
import { AssetKeyDto } from '@nftfi.api/facades/assets/dtos';
import { AssetMetadataService } from './asset-metadata.service';
import { AssetMetadata } from './asset-metadata.types';
import type { AssetDtoOptions, GetOptions } from './asset.types';

export const AssetToCollectionProjectionMap: Partial<Record<AssetProjection, CollectionProjection>> = {
  [AssetProjection.CollectionStats]: CollectionProjection.Stats,
  [AssetProjection.CollectionFloorPrice]: CollectionProjection.FloorPrice
};

@Injectable()
export class AssetService {
  private readonly logger = new Logger(AssetService.name);

  constructor(
    private readonly assetRepository: CollectionAssetRepository,
    private readonly metadataService: AssetMetadataService,
    private readonly alchemyFacade: AlchemyFacade,
    private readonly assetsFacade: AssetsFacade
  ) {}

  @Mutex({
    key: (contract: string, tokenId: string) => `assets:get-by-key:${contract}:${tokenId}`,
    strategy: 'wait',
    msLockTimeout: 30000
  })
  async getByKey(contract: string, tokenId: string): Promise<CollectionAsset> {
    const asset = await this.assetRepository.findByKey(contract, tokenId);
    if (asset) return asset;

    const isAsset = await this.metadataService.isAsset(contract, tokenId);
    if (!isAsset) {
      this.logger.warn(`Asset ${contract}#${tokenId} has not been found onchain`);
      return null;
    }

    const collection = await this.assetsFacade.getCollectionByKey(contract, tokenId);
    if (!collection) {
      this.logger.warn(`Collection not found for asset ${contract}#${tokenId}`);
      return null;
    }

    const createdAsset = await this.assetRepository.create({
      contract,
      tokenId,
      ...(await this.metadataService.getImageUrls(contract, tokenId, { timeoutMs: 1000 })),
      name: await this.metadataService.getName(contract, tokenId),
      collection: {
        id: collection.id
      }
    });
    this.logger.log(`Created asset(id=${createdAsset.id}) ${contract}#${tokenId}`);
    return createdAsset;
  }

  async getByKeys(keys: AssetKeyDto[], options: GetOptions): Promise<CollectionAsset[]> {
    if (!keys.length) return [];

    const limitedKeys = keys.slice(options.skip);
    const existingAssets: CollectionAsset[] = await this.assetRepository.findByKeys(
      limitedKeys.map(key => ({
        contract: key.contract,
        tokenId: key.tokenId
      }))
    );
    const assets: CollectionAsset[] = [];
    for (let i = options.skip; i < keys.length; i++) {
      const { contract, tokenId } = keys[i];
      let asset = existingAssets.find(a => a.contract === contract && a.tokenId === tokenId);

      if (!asset) {
        asset = await this.getByKey(contract, tokenId);
      }

      if (asset && isBoolean(options.whitelisted) && options.whitelisted !== asset.collection.whitelisted) {
        continue;
      }

      if (asset) {
        assets.push(asset);
      }

      if (assets.length >= options.limit) {
        break;
      }
    }

    return assets;
  }

  async getByWallet(wallet: string, options: GetOptions): Promise<CollectionAsset[]> {
    const assets: CollectionAsset[] = [];
    let skipped = 0;
    for await (const nfts of this.alchemyFacade.iterateOverNftsByAccount(wallet, { limit: 100 })) {
      const remainingSkip = Math.max(options.skip - skipped, 0);
      if (remainingSkip >= nfts.length) {
        skipped += nfts.length;
        continue;
      }

      const startIndex = remainingSkip;
      skipped += remainingSkip;

      const remainingLimit = options.limit - assets.length;
      if (remainingLimit <= 0) {
        break;
      }

      const slice = nfts.slice(startIndex, startIndex + remainingLimit);
      if (!slice.length) {
        continue;
      }

      const entries = await this.getByKeys(
        slice.map(nft => ({
          contract: nft.contractAddress.toLowerCase(),
          tokenId: nft.tokenId
        })),
        { whitelisted: options.whitelisted, skip: 0, limit: options.limit - assets.length }
      );
      assets.push(...entries);
      if (assets.length >= options.limit) {
        break;
      }
    }
    return assets;
  }

  async getMany(query: GetAssetArrayQueryDto): Promise<CollectionAsset[]> {
    const options = { skip: (query.page - 1) * query.limit, limit: query.limit, whitelisted: query.whitelisted };
    if (!isNil(query.keys)) {
      return this.getByKeys(query.keys, options);
    }

    if (!isNil(query.wallet)) {
      return this.getByWallet(query.wallet, options);
    }

    return this.assetRepository.find({}, options);
  }

  async updateMissingImageUrls(): Promise<void> {
    for await (const asset of this.assetRepository.iterateOverEmptyImageEntries()) {
      const metadata = await this.metadataService.resolveMissingImageUrls(asset.contract, asset.tokenId);
      await this.updateMetadata(asset, metadata);
    }
  }

  async validateAndRefreshLinks(): Promise<void> {
    for await (const asset of this.assetRepository.iterateOverNonEmptyImageEntries()) {
      const results = await Promise.all([
        this.metadataService.isLinkValid(asset.imageMediumUrl),
        this.metadataService.isLinkValid(asset.imageSmallUrl)
      ]);
      await new Promise(resolve => setTimeout(resolve, 100));
      if (results.includes(false)) {
        this.logger.warn(
          `Updating asset(id=${asset.id}) ${asset.contract}#${asset.tokenId}. It has invalid image links.`
        );
        await this.updateMetadata(asset, await this.metadataService.getImageUrls(asset.contract, asset.tokenId));
      }
    }
  }

  async updateMetadata(asset: CollectionAsset, metadata: Partial<AssetMetadata>): Promise<void> {
    const matched = isEqual(metadata, pick(asset, Object.keys(metadata)));
    if (matched) return;

    await this.assetRepository.updateByIds([asset.id], metadata);
    this.logger.log(
      `Updated asset (id=${asset.id}) ${asset.contract}#${asset.tokenId} metadata: ${JSON.stringify(metadata)}`
    );
  }

  private async getOwners(asset: CollectionAsset): Promise<string[]> {
    if (asset.collection.tokenStandard === TokenStandard.Punks) {
      return [];
    }

    return this.metadataService.getOwners(asset.contract, asset.tokenId);
  }

  async toDto(asset: CollectionAsset): Promise<AssetDto> {
    const dtos = await this.toDtos([asset], { projection: [] });
    return first(dtos);
  }

  async toDtos(assets: CollectionAsset[], options: AssetDtoOptions): Promise<AssetDto[]> {
    if (!assets.length) return [];

    const collectionsProjection = options.projection.reduce<CollectionProjection[]>((acc, curr) => {
      const mapped = AssetToCollectionProjectionMap[curr];
      if (mapped && !acc.includes(mapped)) {
        acc.push(mapped);
      }
      return acc;
    }, []);
    const collections = await this.assetsFacade.getCollections({
      keys: assets.map(asset => ({ contract: asset.contract, tokenId: asset.tokenId })),
      projection: collectionsProjection
    });

    const rawDtos: AssetDto[] = await Promise.all(
      assets.map(async asset => ({
        id: asset.id,
        contract: asset.contract,
        owners: await this.getOwners(asset),
        tokenId: asset.tokenId,
        name: asset.name,
        imageSmallUrl: asset.imageSmallUrl,
        imageMediumUrl: asset.imageMediumUrl,
        collection: AssetsFacade.getClosestCollectionToTokenId(collections, asset.contract, asset.tokenId)
      }))
    );
    return rawDtos.map(rawDto => plainToInstance(AssetDto, rawDto));
  }
}
