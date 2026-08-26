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
import { CollectionAsset } from '@nftfi.api/repositories/postgres/collection-asset';
import { httpValidationPipe } from '@nftfi.api/validation';
import { AssetDto, GetAssetArrayQueryDto } from '@nftfi.api/facades/assets';
import { AssetService } from './asset.service';
import { AssetPipe } from './asset.pipe';

const GetAssetCacheTTL = 1000 * 60 * 5; // 5 mins

@Controller()
@ApiTags('assets')
@ApiSecurity('api-key')
export class AssetV1Controller {
  constructor(private readonly assetService: AssetService) {}

  @Get('/v1/assets/:contract/:tokenId')
  @ApiParam({ name: 'contract', type: String })
  @ApiParam({ name: 'tokenId', type: String })
  @ApiOperation({ operationId: 'AssetV1Controller_handleGetOne' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ok', type: AssetDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Not Found' })
  @CacheTTL(GetAssetCacheTTL)
  @SerializeOptions({ excludeExtraneousValues: true })
  @UseInterceptors(CacheInterceptor, ClassSerializerInterceptor)
  async handleGetOne(@Param(AssetPipe) asset: CollectionAsset): Promise<AssetDto> {
    const dto = await this.assetService.toDto(asset);
    return dto;
  }

  @Get('/v1/assets')
  @ApiOperation({ operationId: 'AssetV1Controller_handleGetMany' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ok', type: AssetDto, isArray: true })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Validation error', type: ResponseErrorsDto })
  @CacheTTL(GetAssetCacheTTL)
  @SerializeOptions({ excludeExtraneousValues: true })
  @UseInterceptors(CacheInterceptor, ClassSerializerInterceptor)
  async handleGetMany(
    @Query(httpValidationPipe) query: GetAssetArrayQueryDto,
    @Response({ passthrough: true }) res: express.Response
  ): Promise<AssetDto[]> {
    const assets = await this.assetService.getMany(query);
    const dtos = await this.assetService.toDtos(assets, { projection: query.projection || [] });

    res.setHeader(HttpResponseHeader.PaginationPage, query.page.toString());
    res.setHeader(HttpResponseHeader.PaginationLimit, query.limit.toString());

    return dtos;
  }
}
