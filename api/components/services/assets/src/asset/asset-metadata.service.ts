import { isFunction, isObject, isString } from 'lodash';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { RedisStore } from 'cache-manager-ioredis-yet';
import { ConfigService } from '@nestjs/config';
import { AlchemyFacade } from '@nftfi.api/facades/alchemy';
import { OpenSeaFacade } from '@nftfi.api/facades/opensea';
import { GcpStorageFacade } from '@nftfi.api/facades';
import { Config } from '../config';
import { MetadataService } from '../metadata.service';
import { AssetContract } from '../asset-contract';
import { MediaProcessorService } from '../media-processor.service';
import { PodResourceGuardService } from '../pod-resource-guard.service';
import { AssetLinks } from './asset-metadata.types';

@Injectable()
export class AssetMetadataService extends MetadataService {
  protected readonly logger = new Logger(AssetMetadataService.name);

  constructor(
    @Inject(CACHE_MANAGER) cacheManager: Cache<RedisStore>,
    private readonly alchemyFacade: AlchemyFacade,
    private readonly openseaFacade: OpenSeaFacade,
    private readonly configService: ConfigService,
    private readonly contractService: AssetContract,
    private readonly podResourceGuard: PodResourceGuardService,
    mediaProcessorService: MediaProcessorService,
    objectStorageFacade: GcpStorageFacade
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

  async getName(contract: string, tokenId: string): Promise<string> {
    const defaultValue = `#${tokenId}`;
    try {
      const metadata = await this.openseaFacade.getNft(contract, tokenId);
      if (metadata.name) return metadata.name;
    } catch {}

    const configName = this.getDefaultName(contract, tokenId);
    if (!configName) return defaultValue;

    return configName;
  }

  async getImageUrls(contract: string, tokenId: string, options: { timeoutMs?: number } = {}): Promise<AssetLinks> {
    const defaultValue: AssetLinks = { imageMediumUrl: null, imageSmallUrl: null };

    if (!(await this.podResourceGuard.hasCapacity(`asset-image-fetch:${contract}#${tokenId}`))) {
      return defaultValue;
    }

    const sizes = this.configService.get<Config['images']['asset']>('images.asset')!;

    const tryGetImageLinks = async (url: string | null): Promise<AssetLinks> => {
      const imageUrl = this.sanitizeUrl(url);
      if (!(await this.verifyUrl(imageUrl))) {
        throw new Error(`Invalid image URL: ${imageUrl}`);
      }
      const links = await this.getStorageUrls(
        {
          url: imageUrl,
          contentType: await this.getContentType(imageUrl)
        },
        `asset-${contract}-${tokenId}`,
        [
          { width: sizes.small.maxWidth, height: sizes.small.maxHeight, name: 'small' },
          { width: sizes.medium.maxWidth, height: sizes.medium.maxHeight, name: 'medium' }
        ]
      );
      return { imageSmallUrl: links[0], imageMediumUrl: links[1] };
    };

    return this.tryResolveWithTimeout(
      async () => {
        try {
          const data = await this.openseaFacade.getNft(contract, tokenId);
          return await tryGetImageLinks(data.image_url);
        } catch {}

        try {
          const data = await this.alchemyFacade.getNftMetadata(contract, tokenId);
          return await tryGetImageLinks(data.image.originalUrl || data.contract.openSeaMetadata.imageUrl);
        } catch {}

        try {
          const defaultUrl = this.getDefaultImageUrl(contract);
          return await tryGetImageLinks(defaultUrl);
        } catch {}

        return defaultValue;
      },
      defaultValue,
      options.timeoutMs
    );
  }

  async resolveMissingImageUrls(contract: string, tokenId: string): Promise<AssetLinks> {
    const unresolvedValue: AssetLinks = { imageMediumUrl: null, imageSmallUrl: null };

    if (!(await this.podResourceGuard.hasCapacity(`asset-missing-image:${contract}#${tokenId}`))) {
      return unresolvedValue;
    }

    const placeholderUrl =
      this.configService.get<Config['images']['placeholder']>('images.placeholder')![contract.toLowerCase()];

    return this.resolveNullableImageWithFibonacciBackoff({
      cacheKey: `assets:missing-image:${contract.toLowerCase()}:${tokenId}`,
      resolve: () => this.getImageUrls(contract, tokenId),
      isResolved: links => isString(links.imageMediumUrl) && isString(links.imageSmallUrl),
      unresolvedValue,
      placeholderValue: { imageMediumUrl: placeholderUrl, imageSmallUrl: placeholderUrl }
    });
  }

  async isAsset(contract: string, tokenId: string): Promise<boolean> {
    try {
      const data = await this.openseaFacade.getNft(contract, tokenId);
      return isObject(data);
    } catch {}

    try {
      const contractInstance = await this.contractService.getContractInstance(contract);
      const owner = await contractInstance.getOwner(tokenId);
      return isString(owner);
    } catch {}

    return false;
  }

  async getOwners(contract: string, tokenId: string): Promise<string[]> {
    try {
      const owners = await this.alchemyFacade.getNftOwners(contract, tokenId);
      return owners.map(owner => owner.toLowerCase());
    } catch {
      return [];
    }
  }

  private getDefaultName(contract: string, tokenId: string): string {
    const config = this.configService.get<Config['images']['defaults']>('images.defaults')[contract.toLowerCase()];
    if (!config) return `#${tokenId}`;
    return isFunction(config.name) ? config.name(tokenId) : config.name;
  }

  private getDefaultImageUrl(contract: string): string | null {
    const config = this.configService.get<Config['images']['defaults']>('images.defaults')[contract.toLowerCase()];
    if (!config) return null;
    return config.imageUrl;
  }
}
