import { plainToInstance } from 'class-transformer';
import { Injectable, Logger } from '@nestjs/common';
import { chain, first, isEqual, pick } from 'lodash';
import { Mutex } from '@nftfi.api/core';
import {
  Collection,
  CollectionRepository,
  CollectionStatsRepository
} from '@nftfi.api/repositories/postgres/collection';
import {
  AssetKeyDto,
  AssetsFacade,
  CollectionDto,
  CollectionProjection,
  CollectionQueryDto,
  CollectionStatsDto,
  CollectionByBorrowerQueryDto
} from '@nftfi.api/facades/assets';
import { CollectionMetadataService } from './collection-metadata.service';
import { CollectionMetadata } from './collection-metadata.types';
import { CollectionDtoOptions } from './collection.types';

@Injectable()
export class CollectionService {
  private readonly logger = new Logger(CollectionService.name);

  constructor(
    private readonly metadataService: CollectionMetadataService,
    private readonly collectionRepository: CollectionRepository,
    private readonly collectionStatsRepository: CollectionStatsRepository
  ) {}

  @Mutex({
    key: (contract: string) => `collections:get-by-key:${contract}`,
    strategy: 'wait',
    msLockTimeout: 30000
  })
  async getByKey(contract: string, tokenId: string): Promise<Collection> {
    const collections = await this.collectionRepository.findByContract(contract);
    if (!collections.length) {
      const isSupported = await this.metadataService.isSupportedTokenStandard(contract);
      if (!isSupported) return null;
    }

    if (collections.length === 1 && collections[0].openseaSlug === null) {
      return this.extendCollectionRangeIfNeeded(collections[0], tokenId);
    }

    const slug = await this.metadataService.getOpenseaSlug(contract, tokenId);
    const collection = collections.find(c => c.openseaSlug === slug);

    if (collection) {
      return this.extendCollectionRangeIfNeeded(collection, tokenId);
    }

    const [tokenRangeBegin, tokenRangeEnd] = this.metadataService.getDefaultTokenRange(tokenId);

    const createdCollection = await this.collectionRepository.create({
      contract,
      tokenRangeBegin,
      tokenRangeEnd,
      tokenStandard: await this.metadataService.getTokenStandard(contract),
      imageUrl: await this.metadataService.getImageUrl(contract, tokenId, { timeoutMs: 1000 }),
      ranking: 0,
      name: await this.metadataService.getName(contract, tokenId),
      openseaSlug: slug,
      npfSlug: null,
      releasedAt: await this.metadataService.getReleasedAt(contract, tokenId),
      whitelisted: false
    });
    this.logger.log(
      `Created collection(id=${createdCollection.id}) for contract ${createdCollection.contract} and mask [${createdCollection.tokenRangeBegin}, ${createdCollection.tokenRangeEnd}]`
    );

    setImmediate(() => {
      this.updateRankings([createdCollection]);
    });

    return createdCollection;
  }

  async getByKeys(keys: AssetKeyDto[]): Promise<Collection[]> {
    if (!keys.length) return [];

    const contracts = chain(keys).map('contract').uniq().value();
    const existingCollections = await this.collectionRepository.find({ contracts });

    const collections: Map<number, Collection> = new Map();
    for (const { contract, tokenId } of keys) {
      let collection = existingCollections.find(
        c => c.contract === contract && AssetsFacade.isInRange(c.tokenRange, tokenId)
      );
      if (!collection) {
        collection = await this.getByKey(contract, tokenId);
      }
      collections.set(collection.id, collection);
    }

    return Array.from(collections.values());
  }

  async getByContract(contract: string): Promise<Collection[]> {
    const collections = await this.collectionRepository.findByContract(contract);
    return collections;
  }

  async getByBorrower(borrower: string, query: CollectionByBorrowerQueryDto): Promise<Collection[]> {
    const collections = await this.collectionRepository.findByBorrower(
      borrower,
      {
        protocols: query.protocols
      },
      {
        skip: (query.page - 1) * query.limit,
        limit: query.limit
      }
    );
    return collections;
  }

  async countByBorrower(borrower: string, query: CollectionByBorrowerQueryDto): Promise<number> {
    return this.collectionRepository.countByBorrower(borrower, query);
  }

  async getMany(params: CollectionQueryDto): Promise<Collection[]> {
    const collections = await this.collectionRepository.find(
      {
        ids: params.ids,
        contracts: params.contracts,
        whitelisted: params.whitelisted,
        loanTotalUsdMin: params.loanTotalUsdMin,
        loanTotalUsdMax: params.loanTotalUsdMax,
        loanAvgUsdMin: params.loanAvgUsdMin,
        loanAvgUsdMax: params.loanAvgUsdMax
      },
      {
        skip: (params.page - 1) * params.limit,
        limit: params.limit,
        sort: { by: 'ranking', direction: 'DESC' }
      }
    );
    return collections;
  }

  async count(params: CollectionQueryDto): Promise<number> {
    return this.collectionRepository.count({
      ids: params.ids,
      contracts: params.contracts,
      whitelisted: params.whitelisted,
      loanTotalUsdMin: params.loanTotalUsdMin,
      loanTotalUsdMax: params.loanTotalUsdMax,
      loanAvgUsdMin: params.loanAvgUsdMin,
      loanAvgUsdMax: params.loanAvgUsdMax
    });
  }

  async validateAndRefreshLinks(): Promise<void> {
    for await (const collection of this.collectionRepository.iterateOverNonEmptyImageEntries()) {
      const isImageValid = await this.metadataService.isLinkValid(collection.imageUrl);
      await new Promise(resolve => setTimeout(resolve, 100));
      if (isImageValid) continue;

      await this.updateMetadata(collection, {
        imageUrl: await this.metadataService.getImageUrl(collection.contract, collection.tokenRangeBegin)
      });
    }
  }

  async updateMissingImageUrls(): Promise<void> {
    for await (const collection of this.collectionRepository.iterateOverEmptyImageEntries()) {
      await this.updateMetadata(collection, {
        imageUrl: await this.metadataService.resolveMissingImageUrl(collection.contract, collection.tokenRangeBegin)
      });
    }
  }

  async updateAllRankings(): Promise<void> {
    for await (const collection of this.collectionRepository.iterate({}, {})) {
      await this.updateRankings([collection]);
    }
  }

  async updateRankings(collections: Collection[]): Promise<void> {
    const stats = await this.collectionStatsRepository.findByIds(collections.map(c => c.id));
    for (const collection of collections) {
      const { totalUsd } = stats.find(s => s.collectionId === collection.id) || { totalUsd: 0 };
      await this.collectionRepository.updateByIds([collection.id], { ranking: Math.floor(totalUsd) });
    }
  }

  async updateMissingNpfSlugs(): Promise<void> {
    for await (const collection of this.collectionRepository.iterateOverEntriesWithEmptyNpfSlug()) {
      const npfSlug = await this.metadataService.getNpfSlug(collection.contract, collection.tokenRangeBegin);
      if (!npfSlug) continue;

      await this.updateMetadata(collection, { npfSlug });
    }
  }

  async updateTokenRanges(): Promise<void> {
    for await (const collection of this.collectionRepository.iterate({}, {})) {
      try {
        const { contract, tokenRangeBegin: collectionTokenId } = collection;
        const slugsAndRanges = await this.metadataService.getSlugsAndRanges(contract);
        for (const range of Object.values(slugsAndRanges)) {
          if (AssetsFacade.isInRange(range, collectionTokenId)) {
            await this.updateMetadata(collection, { tokenRangeBegin: range[0], tokenRangeEnd: range[1] });
          }
        }
      } catch (e) {
        this.logger.error(`Failed to update metadata for collection ${collection.contract}: ${e.message}`);
      }
    }
  }

  async updateMetadata(
    collection: Collection,
    metadata: Partial<CollectionMetadata & Pick<Collection, 'imageUrl'>>
  ): Promise<void> {
    const matched = isEqual(metadata, pick(collection, Object.keys(metadata)));
    if (matched) return;

    await this.collectionRepository.updateByIds([collection.id], metadata);
    this.logger.log(
      `Updated metadata for collection ${collection.contract}(id=${collection.id}): ${JSON.stringify(metadata)}`
    );
  }

  async toDto(collection: Collection, options: CollectionDtoOptions): Promise<CollectionDto> {
    const dtos = await this.toDtos([collection], options);
    return first(dtos);
  }

  async toDtos(collections: Collection[], options: CollectionDtoOptions): Promise<CollectionDto[]> {
    if (!collections.length) return [];

    const dtos: CollectionDto[] = [];
    const [stats] = await Promise.all([
      options.projection.includes(CollectionProjection.Stats)
        ? await this.collectionStatsRepository.findByIds(collections.map(c => c.id))
        : []
    ]);
    for (const collection of collections) {
      let dtoStats: CollectionStatsDto | null = null;
      if (options.projection.includes(CollectionProjection.Stats)) {
        const entityStats = stats.find(s => s.collectionId === collection.id);
        dtoStats = {
          count: entityStats?.count ?? 0,
          totalUsd: entityStats?.totalUsd ?? 0,
          averageUsd: entityStats?.averageUsd ?? 0,
          averageApr: entityStats?.averageApr ?? 0,
          averageDuration: entityStats?.averageDuration ?? 0,
          marketPct: entityStats?.marketPct ?? 0
        };
      }
      dtos.push({
        id: collection.id,
        contract: collection.contract,
        name: collection.name,
        imageUrl: collection.imageUrl,
        ranking: collection.ranking,
        whitelisted: collection.whitelisted,
        openseaSlug: collection.openseaSlug,
        tokenSupply: AssetsFacade.getTokenSupply(collection.tokenRange),
        tokenRange: collection.tokenRange.join(':'),
        tokenStandard: collection.tokenStandard,
        floor: null,
        stats: dtoStats
      });
    }
    return plainToInstance(CollectionDto, dtos);
  }

  private async extendCollectionRangeIfNeeded(collection: Collection, tokenId: string): Promise<Collection> {
    if (!AssetsFacade.isInRange(collection.tokenRange, tokenId)) {
      const [tokenRangeBegin, tokenRangeEnd] = AssetsFacade.extendRange(collection.tokenRange, tokenId);
      await this.collectionRepository.updateByIds([collection.id], { tokenRangeBegin, tokenRangeEnd });
      collection.tokenRange = [tokenRangeBegin, tokenRangeEnd];
      this.logger.log(
        `Extended collection(id=${collection.id}) range for contract ${collection.contract} and mask ${collection.tokenRange}`
      );
    }
    return collection;
  }
}
