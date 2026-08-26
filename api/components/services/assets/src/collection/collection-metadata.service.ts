import { isString } from 'lodash';
import { ConfigService } from '@nestjs/config';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache as CacheManager } from 'cache-manager';
import { RedisStore } from 'cache-manager-ioredis-yet';
import { Cache as CacheDecorator } from '@nftfi.api/core';
import { GcpStorageFacade } from '@nftfi.api/facades';
import { OpenSeaFacade } from '@nftfi.api/facades/opensea';
import { NftPriceFloorFacade } from '@nftfi.api/facades/nft-price-floor';
import { TokenStandard } from '@nftfi.api/repositories/postgres/collection';
import { AssetsFacade } from '@nftfi.api/facades/assets';
import { MetadataService } from '../metadata.service';
import { MediaProcessorService } from '../media-processor.service';
import { PodResourceGuardService } from '../pod-resource-guard.service';
import { Config } from '../config';
import { AssetContract } from '../asset-contract';
import { GetImageUrlOptions } from './collection-metadata.types';

const TTL_30_DAYS = 1000 * 60 * 60 * 24 * 30;

const CacheSlugsAndRanges = CacheDecorator((_i, contract) => `collections:slugs-and-ranges:${contract}`, TTL_30_DAYS);

type ForwardedCollections = Config['npf']['forwardedCollections'];

@Injectable()
export class CollectionMetadataService extends MetadataService {
  protected readonly logger = new Logger(CollectionMetadataService.name);

  constructor(
    @Inject(CACHE_MANAGER) cacheManager: CacheManager<RedisStore>,
    private readonly configService: ConfigService,
    private readonly npfFacade: NftPriceFloorFacade,
    private readonly openseaFacade: OpenSeaFacade,
    private readonly contractService: AssetContract,
    private readonly podResourceGuard: PodResourceGuardService,
    objectStorageFacade: GcpStorageFacade,
    mediaProcessorService: MediaProcessorService
  ) {
    super(
      {
        baseDir: configService.get<Config['baseDir']>('baseDir'),
        bucket: configService.get<Config['buckets']['assets']>('buckets.assets')
      },
      mediaProcessorService,
      objectStorageFacade,
      cacheManager
    );
  }

  @CacheSlugsAndRanges
  async getSlugsAndRanges(contract: string): Promise<Record<string, [string, string]>> {
    const slugToTokens: Record<string, [string, string]> = {};
    for await (const nfts of this.openseaFacade.iterateOverNftsByContract(contract, { limit: 100 })) {
      for (const nft of nfts) {
        const existingRange = slugToTokens[nft.collection] ?? this.getDefaultTokenRange(nft.identifier);
        const nextRange = AssetsFacade.extendRange(existingRange, nft.identifier);
        slugToTokens[nft.collection] = nextRange;
      }
    }
    return slugToTokens;
  }

  async isSupportedTokenStandard(contract: string): Promise<boolean> {
    try {
      const data = await this.getTokenStandard(contract);
      const allowed: TokenStandard[] = [TokenStandard.ERC721, TokenStandard.ERC1155, TokenStandard.Punks];
      return allowed.includes(data);
    } catch {
      return false;
    }
  }

  async getTokenStandard(contract: string): Promise<TokenStandard> {
    try {
      const { contract_standard } = await this.openseaFacade.getContract(contract);
      if (contract_standard === 'erc721') {
        return TokenStandard.ERC721;
      }
      if (contract_standard === 'erc1155') {
        return TokenStandard.ERC1155;
      }
      if (contract_standard === 'cryptopunks') {
        return TokenStandard.Punks;
      }
    } catch {}
    const instance = await this.contractService.getContractInstance(contract);
    return instance.tokenStandard;
  }

  async getName(contract: string, tokenId: string): Promise<string> {
    const defaultValue = contract;
    try {
      const slug = await this.getOpenseaSlug(contract, tokenId);
      if (!slug) return defaultValue;

      const data = await this.openseaFacade.getCollectionBySlug(slug);
      return data.name;
    } catch (e) {
      this.logger.error(`Failed to get name for contract ${contract}: ${e.message}`);
    }
    return defaultValue;
  }

  async getImageUrl(contract: string, tokenId: string, options: GetImageUrlOptions = {}): Promise<string> {
    const defaultValue = null;

    if (!(await this.podResourceGuard.hasCapacity(`collection-image-fetch:${contract}#${tokenId}`))) {
      return defaultValue;
    }

    const sizes = this.configService.get<Config['images']['project']>('images.project');
    const errorPrefix = `Failed to get image URL for contract ${contract}:`;

    return this.tryResolveWithTimeout(
      async () => {
        try {
          const nft = await this.openseaFacade.getNft(contract, tokenId);
          const collection = await this.openseaFacade.getCollectionBySlug(nft.collection);
          const url = this.sanitizeUrl(collection.image_url);
          if (!url) return defaultValue;

          const image = {
            url,
            contentType: await this.getContentType(url)
          };

          const isImageValid = await this.verifyUrl(image.url);
          if (!isImageValid) return defaultValue;

          const [imageUrl] = await this.getStorageUrls(image, `collection-${contract}-${tokenId}`, [
            { width: sizes.small.maxWidth, height: sizes.small.maxHeight, name: 'small' }
          ]);

          return imageUrl;
        } catch (e) {
          this.logger.error(`${errorPrefix} ${e.message}`);
        }

        return defaultValue;
      },
      defaultValue,
      options.timeoutMs
    );
  }

  async getOpenseaSlug(contract: string, tokenId: string): Promise<string> {
    try {
      const nft = await this.openseaFacade.getNft(contract, tokenId);
      return nft.collection;
    } catch (e) {
      this.logger.error(`Failed to get OpenSea slug for contract ${contract}: ${e.message}`);
    }
    return null;
  }

  async resolveMissingImageUrl(contract: string, tokenId: string): Promise<string> {
    if (!(await this.podResourceGuard.hasCapacity(`collection-missing-image:${contract}#${tokenId}`))) {
      return null;
    }

    const placeholderUrl =
      this.configService.get<Config['images']['placeholder']>('images.placeholder')[contract.toLowerCase()];

    return this.resolveNullableImageWithFibonacciBackoff({
      cacheKey: `collections:missing-image:${contract.toLowerCase()}:${tokenId}`,
      resolve: () => this.getImageUrl(contract, tokenId),
      isResolved: url => isString(url),
      unresolvedValue: null,
      placeholderValue: placeholderUrl
    });
  }

  async getNpfSlug(contract: string, tokenId: string): Promise<string> {
    try {
      const forwardedCollections = this.configService.get<ForwardedCollections>('npf.forwardedCollections');
      for (const [slug, masks] of forwardedCollections.entries()) {
        for (const mask of masks) {
          const forwarded = NftPriceFloorFacade.parseMask(mask);
          if (forwarded.contract === contract && !forwarded.range) {
            return slug;
          }

          if (forwarded.contract === contract && AssetsFacade.isInRange(forwarded.range, tokenId)) {
            return slug;
          }
        }
      }

      for await (const projects of this.npfFacade.iterateProjects()) {
        for (const project of projects) {
          const id = project.providerCollectionId || project.stats.floorInfo.marketplaceSlug;
          if (!id) continue;
          try {
            const mask = NftPriceFloorFacade.parseMask(id);

            if (mask.contract === contract && !mask.range) {
              return project.slug;
            }

            if (mask.contract === contract && AssetsFacade.isInRange(mask.range, tokenId)) {
              return project.slug;
            }

            continue;
          } catch {}

          try {
            const data = await this.openseaFacade.getCollectionBySlug(id);
            const match = data.contracts.some(v => v.address.toLowerCase() === contract);
            if (match) return project.slug;
          } catch {}
        }
      }
    } catch {
      this.logger.error(`Failed to get NPF slug for contract ${contract}`);
    }
    return null;
  }

  getDefaultTokenRange(tokenId: string): [string, string] {
    return [tokenId, tokenId];
  }

  async getReleasedAt(contract: string, tokenId: string): Promise<Date> {
    const defaultValue = new Date('2022-01-01');
    const slug = await this.getOpenseaSlug(contract, tokenId);
    if (!slug) return defaultValue;

    const collection = await this.openseaFacade.getCollectionBySlug(slug);
    if (collection?.created_date) {
      return new Date(collection.created_date);
    }

    return defaultValue;
  }
}
