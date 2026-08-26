import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { HttpCacheInterceptor } from '@nftfi.api/core/interceptors';
import { type FindConditions } from '@nftfi.api/repositories/postgres/listing';
import { ListingV1Service } from './listing-v1.service';
import { ListingV01GetQueryDto, ListingV01ItemDto, ListingV1Dto } from './dtos';
import { ListingsCacheScope } from './listing-v1.types';

const GetCacheTTL = 1000 * 5; // 5 seconds

@CacheKey(ListingsCacheScope)
@Controller('/v0.1')
@ApiTags('v0.1')
@ApiSecurity('api_key')
export class ListingV01Controller {
  constructor(private readonly listingService: ListingV1Service) {}

  @Get('/listings')
  @ApiOperation({ operationId: 'ListingV01Controller_handleGet' })
  @ApiResponse({ status: 200, description: 'Ok' })
  @CacheTTL(GetCacheTTL)
  @CacheKey('v01-get-listings')
  @UseInterceptors(HttpCacheInterceptor)
  async handleGet(@Query() query: ListingV01GetQueryDto): Promise<{ results: ListingV01ItemDto[] }> {
    const filter: Partial<FindConditions> = {};
    if (query.nftAddresses?.length) {
      filter.nftContracts = query.nftAddresses;
    }
    const entities = await this.listingService.getManyByFilter(filter, {
      page: query.page,
      limit: query.limit
    });
    const listings = await this.listingService.toDtos(entities);

    return {
      results: plainToInstance(
        ListingV01ItemDto,
        listings.map(listing => this.toV01Item(listing))
      )
    };
  }

  private toV01Item(listing: ListingV1Dto): ListingV01ItemDto {
    const contract = listing.asset?.contract || '';
    const tokenId = listing.asset?.tokenId || '';
    const id = encodeURIComponent(Buffer.from(`${contract}/${tokenId}`).toString('base64'));

    return {
      id,
      date: {
        listed: listing.createdAt
      },
      nft: {
        id: tokenId,
        address: contract,
        name: listing.asset?.name || null,
        project: {
          name: listing.asset?.collection?.name || null
        }
      },
      borrower: {
        address: listing.borrower
      },
      terms: {
        loan: {
          duration: listing.duration ? listing.duration / 86400 : null,
          repayment: null,
          principal: null,
          currency: listing.currency || null,
          unit: null
        }
      },
      nftfi: {
        contract: {
          name: 'v2-3.loan.fixed'
        }
      }
    } as ListingV01ItemDto;
  }
}
