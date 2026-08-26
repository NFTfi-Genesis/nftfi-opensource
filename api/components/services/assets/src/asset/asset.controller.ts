import { ApiOperation, ApiParam, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  HttpStatus,
  Param,
  UseInterceptors,
  ClassSerializerInterceptor,
  SerializeOptions,
  UseFilters,
  Query,
  UsePipes
} from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { RpcCacheInterceptor, RpcLoggingInterceptor } from '@nftfi.api/core/interceptors';
import { RpcValidationPipe } from '@nftfi.api/core/pipes';
import {
  getResponseArrayBodyDto,
  getResponseBodyDto,
  ResponseArrayBody,
  ResponseBody,
  ResponseErrorsDto
} from '@nftfi.api/core/dtos';
import { CollectionAsset } from '@nftfi.api/repositories/postgres/collection-asset';
import { HttpToRpcExceptionFilter } from '@nftfi.api/core/filters';
import { httpValidationPipe } from '@nftfi.api/validation';
import { RPCResponse } from '@nftfi.api/facades/queue';
import { AssetDto, AssetsQueueTopic, GetAssetArrayQueryDto, GetAssetsByKeysDto } from '@nftfi.api/facades/assets';
import { AssetService } from './asset.service';
import { AssetPipe } from './asset.pipe';

const GetAssetResponseDto = getResponseBodyDto(AssetDto);
const GetAssetArrayResponseDto = getResponseArrayBodyDto(AssetDto);
const GetAssetCacheTTL = 1000 * 60 * 5; // 5 mins

@Controller()
@ApiTags('assets')
@ApiSecurity('api-key')
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Get('/assets/:contract/:tokenId')
  @ApiParam({ name: 'contract', type: String })
  @ApiParam({ name: 'tokenId', type: String })
  @ApiOperation({ operationId: 'AssetController_handleGetOne' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ok', type: GetAssetResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Not Found' })
  @CacheTTL(GetAssetCacheTTL)
  @SerializeOptions({ excludeExtraneousValues: true })
  @UseInterceptors(CacheInterceptor, ClassSerializerInterceptor)
  async handleGetOne(@Param(AssetPipe) asset: CollectionAsset): Promise<ResponseBody<AssetDto>> {
    const dto = await this.assetService.toDto(asset);
    return new GetAssetResponseDto(dto);
  }

  @Get('/assets')
  @ApiOperation({ operationId: 'AssetController_handleGetMany' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ok', type: GetAssetArrayResponseDto })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Validation error', type: ResponseErrorsDto })
  @CacheTTL(GetAssetCacheTTL)
  @SerializeOptions({ excludeExtraneousValues: true })
  @UseInterceptors(CacheInterceptor, ClassSerializerInterceptor)
  async handleGetMany(@Query(httpValidationPipe) query: GetAssetArrayQueryDto): Promise<ResponseArrayBody<AssetDto>> {
    const assets = await this.assetService.getMany(query);
    const dtos = await this.assetService.toDtos(assets, { projection: query.projection || [] });
    return new GetAssetArrayResponseDto(dtos);
  }

  @EventPattern(AssetsQueueTopic.CreateAsset)
  async handleCreateMessage(@Payload(AssetPipe) _asset: CollectionAsset): Promise<void> {
    void 0;
  }

  @CacheTTL(GetAssetCacheTTL)
  @SerializeOptions({ excludeExtraneousValues: true })
  @UseFilters(HttpToRpcExceptionFilter)
  @UsePipes(RpcValidationPipe)
  @UseInterceptors(RpcLoggingInterceptor, RpcCacheInterceptor, ClassSerializerInterceptor)
  @MessagePattern(AssetsQueueTopic.GetAssetByKey)
  async handleGetMessage(@Payload(AssetPipe) asset: CollectionAsset): Promise<RPCResponse<AssetDto>> {
    return { data: await this.assetService.toDto(asset) };
  }

  @CacheTTL(GetAssetCacheTTL)
  @SerializeOptions({ excludeExtraneousValues: true })
  @UseFilters(HttpToRpcExceptionFilter)
  @UsePipes(RpcValidationPipe)
  @UseInterceptors(RpcLoggingInterceptor, RpcCacheInterceptor, ClassSerializerInterceptor)
  @MessagePattern(AssetsQueueTopic.GetAssets)
  async handleGetManyMessage(@Payload() payload: GetAssetsByKeysDto): Promise<RPCResponse<AssetDto[]>> {
    const assets = await this.assetService.getByKeys(payload.keys, { skip: 0, limit: payload.keys.length });
    const dtos = await this.assetService.toDtos(assets, { projection: [] });
    return { data: dtos };
  }
}
