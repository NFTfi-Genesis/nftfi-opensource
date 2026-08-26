import * as express from 'express';
import { Controller, Get, Headers, HttpStatus, Response, UseInterceptors } from '@nestjs/common';
import { CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { HttpCacheInterceptor } from '@nftfi.api/core/interceptors';
import { type FindConditions } from '@nftfi.api/repositories/postgres/listing';
import { ListingV1Service } from './listing-v1.service';
import { ListingLegacyDto, ListingV1Dto } from './dtos';
import { ListingsCacheScope } from './listing-v1.types';

const GetCacheTTL = 1000 * 5; // 5 seconds

@CacheKey(ListingsCacheScope)
@Controller()
@ApiTags('legacy')
@ApiSecurity('api_key')
export class ListingLegacyController {
  constructor(private readonly listingService: ListingV1Service) {}

  @Get('/listings')
  @ApiOperation({ operationId: 'ListingLegacyController_handleGet' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ok' })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Missing required headers' })
  @CacheTTL(GetCacheTTL)
  @CacheKey('legacy-get-listings')
  @UseInterceptors(HttpCacheInterceptor)
  async handleGet(
    @Headers('x-filters') xFilters: string,
    @Headers('x-paging') xPaging: string,
    @Response({ passthrough: true }) res: express.Response
  ): Promise<ListingLegacyDto[]> {
    if (!xFilters || !xPaging) {
      res.status(HttpStatus.UNPROCESSABLE_ENTITY);
      return [];
    }

    const rawFilters = JSON.parse(xFilters);
    const paging = JSON.parse(xPaging);

    const filter: Partial<FindConditions> = {};
    if (rawFilters.nftCollateralContract?.length) {
      filter.nftContracts = rawFilters.nftCollateralContract.map((a: string) => a.toLowerCase());
    }

    const limit = paging.limit || 50;
    const skip = paging.skip || 0;
    const page = Math.floor(skip / limit) + 1;

    const [entities, total] = await Promise.all([
      this.listingService.getManyByFilter(filter, { page, limit }),
      this.listingService.countByFilter(filter)
    ]);
    const listings = await this.listingService.toDtos(entities);

    res.setHeader('X-Total', total.toString());
    return listings.map(listing => this.toLegacyDto(listing));
  }

  private toLegacyDto(listing: ListingV1Dto): ListingLegacyDto {
    const contract = listing.asset?.contract || '';
    const tokenId = listing.asset?.tokenId || '';

    return {
      contractName: 'v2-3.loan.fixed',
      nonce: null,
      nftCollateralId: tokenId,
      nftCollateralContract: contract,
      nftKey: `${tokenId}${contract}`,
      borrower: listing.borrower,
      listedBy: null,
      signedMessage: null,
      desiredLoanPrincipalAmount: null,
      desiredLoanDuration: listing.duration ? String(listing.duration / 86400) : null,
      desiredLoanCurrency: listing.currency || null,
      desiredLoanCurrencyContract: null,
      desiredRepaymentAmount: null,
      desiredIsProRata: listing.prorated ?? null,
      desiredPreference: listing.preference || null,
      minLoanDuration: null,
      maxLoanDuration: null,
      maximumRepaymentAmount: null,
      revenueSharePartner: null,
      loanInterestRateForDurationInBasisPoints: null,
      referralFeeInBasisPoints: null,
      listedDate: listing.createdAt,
      status: 'listed',
      whitelisted: true,
      isDeleted: false,
      name: listing.asset?.name || null,
      projectName: listing.asset?.collection?.name || null,
      imageUrl: listing.asset?.imageMediumUrl || null
    } as ListingLegacyDto;
  }
}
