import * as express from 'express';
import { ApiOperation, ApiParam, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  HttpStatus,
  Param,
  UseInterceptors,
  ClassSerializerInterceptor,
  SerializeOptions,
  Query,
  Response
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { HttpResponseHeader, ResponseErrorsDto } from '@nftfi.api/core/dtos';
import { httpValidationPipe } from '@nftfi.api/validation/api-validation.pipe';
import {
  CollectionDto,
  CollectionProjection,
  CollectionQueryDto,
  CollectionByBorrowerQueryDto
} from '@nftfi.api/facades/assets';
import { CollectionService } from './collection.service';

const GetCollectionsCacheTTL = 1000 * 60 * 5; // 5 minutes
const GetCollectionsByBorrowerCacheTTL = 1000 * 60 * 1; // 1 minute

@Controller()
@ApiTags('collections')
@ApiSecurity('api-key')
export class CollectionV1Controller {
  constructor(private readonly service: CollectionService) {}

  @Get('/v1/collections')
  @ApiOperation({ operationId: 'CollectionV1Controller_handleGetMany' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ok', type: CollectionDto, isArray: true })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Validation Error', type: ResponseErrorsDto })
  @CacheTTL(GetCollectionsCacheTTL)
  @SerializeOptions({ excludeExtraneousValues: true })
  @UseInterceptors(CacheInterceptor, ClassSerializerInterceptor)
  async handleGetMany(
    @Query(httpValidationPipe) query: CollectionQueryDto,
    @Response({ passthrough: true }) res: express.Response
  ): Promise<CollectionDto[]> {
    const [collections, total] = await Promise.all([this.service.getMany(query), this.service.count(query)]);
    const dtos = await this.service.toDtos(collections, { projection: query.projection || [] });

    res.setHeader(HttpResponseHeader.PaginationPage, query.page.toString());
    res.setHeader(HttpResponseHeader.PaginationLimit, query.limit.toString());
    res.setHeader(HttpResponseHeader.PaginationTotal, total.toString());
    return dtos;
  }

  @Get('/v1/collections/:contract')
  @ApiParam({ name: 'contract', type: String })
  @ApiOperation({ operationId: 'CollectionV1Controller_handleGet' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ok', type: CollectionDto, isArray: true })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Not Found' })
  @CacheTTL(GetCollectionsCacheTTL)
  @SerializeOptions({ excludeExtraneousValues: true })
  @UseInterceptors(CacheInterceptor, ClassSerializerInterceptor)
  async handleGet(@Param('contract') contract: string): Promise<CollectionDto[]> {
    const collections = await this.service.getByContract(contract);
    const dtos = await this.service.toDtos(collections, { projection: [CollectionProjection.FloorPrice] });
    return dtos;
  }

  @Get('v1/borrowers/:wallet/collections')
  @ApiParam({ name: 'wallet', type: String })
  @ApiOperation({ operationId: 'CollectionV1Controller_handleGetByBorrower' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ok', type: CollectionDto, isArray: true })
  @CacheTTL(GetCollectionsByBorrowerCacheTTL)
  @SerializeOptions({ excludeExtraneousValues: true })
  @UseInterceptors(CacheInterceptor, ClassSerializerInterceptor)
  async handleGetByBorrower(
    @Param('wallet') wallet: string,
    @Query() query: CollectionByBorrowerQueryDto,
    @Response({ passthrough: true }) res: express.Response
  ): Promise<CollectionDto[]> {
    const lcWallet = wallet.toLowerCase();
    const [collections, total] = await Promise.all([
      this.service.getByBorrower(lcWallet, query),
      this.service.countByBorrower(lcWallet, query)
    ]);
    const dtos = await this.service.toDtos(collections, { projection: [] });

    res.setHeader(HttpResponseHeader.PaginationPage, query.page.toString());
    res.setHeader(HttpResponseHeader.PaginationLimit, query.limit.toString());
    res.setHeader(HttpResponseHeader.PaginationTotal, total.toString());
    return dtos;
  }
}
