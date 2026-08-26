import { ForbiddenException, Inject, Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { RedisStore } from 'cache-manager-ioredis-yet';
import { plainToInstance } from 'class-transformer';
import { SortDirection } from '@nftfi.api/validation';
import { invalidateCacheByScope } from '@nftfi.api/core';
import {
  Listing,
  ListingRepository,
  ListingDeletedReason,
  type FindConditions
} from '@nftfi.api/repositories/postgres/listing';
import { TokenStandard } from '@nftfi.api/repositories/postgres/collection';
import { AssetDto, AssetsFacade } from '@nftfi.api/facades/assets';
import { AssetContract } from '@nftfi.api/services/assets';
import { type AuthTokenPayload } from '@nftfi.api/modules/auth-guard';
import { ListingV1Dto, ListingV1GetQueryDto, ListingV1CreateBodyDto, ListingV1UpdateBodyDto } from './dtos';
import { ListingNotificationService } from './listing-notification.service';
import { ListingsCacheScope } from './listing-v1.types';

@Injectable()
export class ListingV1Service {
  private readonly logger = new Logger(ListingV1Service.name);

  constructor(
    private readonly listingRepository: ListingRepository,
    private readonly assetsFacade: AssetsFacade,
    private readonly notificationService: ListingNotificationService,
    private readonly assetContractService: AssetContract,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache<RedisStore>
  ) {}

  async getMany(query: ListingV1GetQueryDto): Promise<Listing[]> {
    const skip = (query.page - 1) * query.limit;
    const sortDirection = query.sortDirection === SortDirection.Asc ? 'ASC' : 'DESC';

    return this.listingRepository.find(this.buildFilter(query), {
      skip,
      limit: query.limit,
      sort: query.sortBy ? { by: query.sortBy, direction: sortDirection } : undefined
    });
  }

  async count(query: ListingV1GetQueryDto): Promise<number> {
    return this.listingRepository.count(this.buildFilter(query));
  }

  async getManyByFilter(filter: Partial<FindConditions>, options: { page: number; limit: number }): Promise<Listing[]> {
    const skip = (options.page - 1) * options.limit;
    return this.listingRepository.find(filter, {
      skip,
      limit: options.limit,
      sort: { by: 'createdAt', direction: 'DESC' }
    });
  }

  async countByFilter(filter: Partial<FindConditions>): Promise<number> {
    return this.listingRepository.count(filter);
  }

  async create(body: ListingV1CreateBodyDto, authToken: AuthTokenPayload): Promise<Listing> {
    if (authToken.account.toLowerCase() !== body.borrower) {
      throw new ForbiddenException('Authenticated user must be the borrower');
    }

    const existing = await this.listingRepository.findByAsset(body.nftContract, body.nftTokenId);
    if (existing) {
      throw new ConflictException('Listing already exists for this asset');
    }

    const assetDto = await this.assetsFacade.getAssetByKey(body.nftContract, body.nftTokenId);
    this.assertAsset(assetDto, body);

    const isOwner = await this.assetContractService.isOwnerOf(body.nftContract, body.nftTokenId, body.borrower);
    if (!isOwner) {
      throw new ForbiddenException('Borrower does not own this asset');
    }

    const listing = await this.listingRepository.create({
      nftContract: body.nftContract,
      nftTokenId: body.nftTokenId,
      borrower: body.borrower,
      duration: body.duration,
      currency: body.currency,
      prorated: body.prorated,
      preference: body.preference,
      asset: { id: assetDto.id }
    });

    await this.invalidateCache();
    this.notificationService.notifyNewListing(body.nftContract, body.nftTokenId, assetDto);

    return listing;
  }

  async update(listing: Listing, body: ListingV1UpdateBodyDto, authToken: AuthTokenPayload): Promise<Listing> {
    this.assertBorrower(listing, authToken);

    const updated = await this.listingRepository.update(listing.id, {
      duration: body.duration,
      currency: body.currency,
      prorated: body.prorated,
      preference: body.preference
    });

    await this.invalidateCache();
    return updated;
  }

  async delete(listing: Listing, authToken: AuthTokenPayload): Promise<void> {
    this.assertBorrower(listing, authToken);
    await this.listingRepository.softDelete(listing.id, ListingDeletedReason.UserAction);
    await this.invalidateCache();
  }

  async deleteByAsset(nftContract: string, nftTokenId: string, reason: ListingDeletedReason): Promise<void> {
    const listing = await this.listingRepository.findByAsset(nftContract.toLowerCase(), nftTokenId);
    if (!listing) {
      return;
    }
    await this.listingRepository.softDelete(listing.id, reason);
    await this.invalidateCache();
  }

  async deleteTransferredListings(): Promise<void> {
    for await (const listing of this.listingRepository.iterateAll()) {
      try {
        const isOwner = await this.assetContractService.isOwnerOf(
          listing.nftContract,
          listing.nftTokenId,
          listing.borrower
        );
        if (!isOwner) {
          await this.deleteByAsset(listing.nftContract, listing.nftTokenId, ListingDeletedReason.OwnershipChanged);
        }
      } catch (error) {
        this.logger.warn(
          `Ownership check failed for ${listing.nftContract}/${listing.nftTokenId}, skipping: ${
            (error as Error)?.message
          }`
        );
      }
    }
  }

  private assertAsset(asset: AssetDto, listing: ListingV1CreateBodyDto): void {
    if (!asset) {
      throw new NotFoundException(`Asset ${listing.nftContract}/${listing.nftTokenId} not found on-chain`);
    }
    if (!asset.collection.whitelisted) {
      throw new ForbiddenException(`Collection ${asset.collection.name || listing.nftContract} is not whitelisted`);
    }

    if (![TokenStandard.ERC721, TokenStandard.Punks].includes(asset.collection.tokenStandard)) {
      throw new ForbiddenException('Only ERC721 and Punks assets are supported for listings');
    }
  }

  private assertBorrower(listing: Listing, authToken: AuthTokenPayload): void {
    if (authToken.account.toLowerCase() !== listing.borrower) {
      throw new ForbiddenException('Authenticated user must be the borrower');
    }
  }

  private async invalidateCache(): Promise<void> {
    await invalidateCacheByScope(this.cacheManager, ListingsCacheScope);
  }

  private buildFilter(query: ListingV1GetQueryDto): Partial<FindConditions> {
    return {
      borrower: query.borrower,
      currency: query.currency,
      duration: query.duration,
      collectionIds: query.collectionIds
    };
  }

  async toDtos(listings: Listing[]): Promise<ListingV1Dto[]> {
    const assets = await this.assetsFacade.getAssets({
      keys: listings.map(listing => ({ contract: listing.nftContract, tokenId: listing.nftTokenId }))
    });

    const result = listings.map(listing => {
      const asset = assets.find(a => a.contract === listing.nftContract && a.tokenId === listing.nftTokenId);
      return {
        id: listing.id,
        borrower: listing.borrower,
        currency: listing.currency,
        duration: listing.duration,
        prorated: listing.prorated,
        preference: listing.preference,
        createdAt: listing.createdAt,
        asset
      };
    });

    return plainToInstance(ListingV1Dto, result);
  }
}
