import * as express from 'express';
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Query,
  Response,
  SerializeOptions,
  UseFilters,
  UseGuards,
  UseInterceptors,
  UsePipes
} from '@nestjs/common';
import { CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ApiOperation, ApiParam, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { type AuthTokenPayload, DecodedAuthToken, AuthGuard } from '@nftfi.api/modules/auth-guard';
import { ListingsQueueTopic, type DeleteListingPayload } from '@nftfi.api/facades/listings';
import { HttpCacheInterceptor, RpcLoggingInterceptor } from '@nftfi.api/core/interceptors';
import { RpcValidationPipe } from '@nftfi.api/core/pipes';
import { HttpToRpcExceptionFilter } from '@nftfi.api/core/filters';
import { ApiPaginationHeaders, HttpResponseHeader, ResponseErrorsDto } from '@nftfi.api/core/dtos';
import { Listing } from '@nftfi.api/repositories/postgres/listing';
import { ListingV1Service } from './listing-v1.service';
import { ListingV1Dto, ListingV1GetQueryDto, ListingV1CreateBodyDto, ListingV1UpdateBodyDto } from './dtos';
import { ListingPipe, ListingParam } from './listing.pipe';
import { ListingsCacheScope } from './listing-v1.types';

const GetCacheTTL = 1000 * 5; // 5 seconds

@CacheKey(ListingsCacheScope)
@Controller('/v1/listings')
@ApiTags('v1')
@ApiSecurity('api_key')
export class ListingV1Controller {
  constructor(private readonly listingService: ListingV1Service) {}

  @Get()
  @ApiOperation({ operationId: 'ListingV1Controller_handleGet' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ok', type: [ListingV1Dto], headers: ApiPaginationHeaders })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Validation error', type: ResponseErrorsDto })
  @CacheTTL(GetCacheTTL)
  @CacheKey('get-many')
  @SerializeOptions({ excludeExtraneousValues: true })
  @UseInterceptors(HttpCacheInterceptor, ClassSerializerInterceptor)
  async handleGet(
    @Query() query: ListingV1GetQueryDto,
    @Response({ passthrough: true }) res: express.Response
  ): Promise<ListingV1Dto[]> {
    const [listings, total] = await Promise.all([this.listingService.getMany(query), this.listingService.count(query)]);

    res.setHeader(HttpResponseHeader.PaginationPage, query.page.toString());
    res.setHeader(HttpResponseHeader.PaginationLimit, query.limit.toString());
    res.setHeader(HttpResponseHeader.PaginationTotal, total.toString());
    return this.listingService.toDtos(listings);
  }

  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ operationId: 'ListingV1Controller_handlePost' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Created', type: ListingV1Dto })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Validation error', type: ResponseErrorsDto })
  @SerializeOptions({ excludeExtraneousValues: true })
  @UseInterceptors(ClassSerializerInterceptor)
  async handlePost(
    @Body() body: ListingV1CreateBodyDto,
    @DecodedAuthToken() authToken: AuthTokenPayload
  ): Promise<ListingV1Dto> {
    const listing = await this.listingService.create(body, authToken);
    const [dto] = await this.listingService.toDtos([listing]);
    return dto;
  }

  @Put(':nftContract/:nftTokenId')
  @UseGuards(AuthGuard)
  @ApiOperation({ operationId: 'ListingV1Controller_handlePut' })
  @ApiParam({ name: 'nftContract', type: String })
  @ApiParam({ name: 'nftTokenId', type: String })
  @ApiResponse({ status: HttpStatus.OK, description: 'Updated', type: ListingV1Dto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Listing not found' })
  @SerializeOptions({ excludeExtraneousValues: true })
  @UseInterceptors(ClassSerializerInterceptor)
  async handlePut(
    @ListingParam(ListingPipe) listing: Listing,
    @Body() body: ListingV1UpdateBodyDto,
    @DecodedAuthToken() authToken: AuthTokenPayload
  ): Promise<ListingV1Dto> {
    const updated = await this.listingService.update(listing, body, authToken);
    const [dto] = await this.listingService.toDtos([updated]);
    return dto;
  }

  @Delete(':nftContract/:nftTokenId')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'ListingV1Controller_handleDelete' })
  @ApiParam({ name: 'nftContract', type: String })
  @ApiParam({ name: 'nftTokenId', type: String })
  @ApiResponse({ status: HttpStatus.OK, description: 'Deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Listing not found' })
  async handleDelete(
    @ListingParam(ListingPipe) listing: Listing,
    @DecodedAuthToken() authToken: AuthTokenPayload
  ): Promise<void> {
    return this.listingService.delete(listing, authToken);
  }

  @UseFilters(HttpToRpcExceptionFilter)
  @UsePipes(RpcValidationPipe)
  @UseInterceptors(RpcLoggingInterceptor)
  @EventPattern(ListingsQueueTopic.DeleteListing)
  async handleDeleteListingEvent(@Payload() payload: DeleteListingPayload): Promise<void> {
    await this.listingService.deleteByAsset(payload.nftContract, payload.nftTokenId, payload.reason);
  }
}
