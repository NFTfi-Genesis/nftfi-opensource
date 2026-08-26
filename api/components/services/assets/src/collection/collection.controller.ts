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
  UseFilters,
  UsePipes
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { RpcCacheInterceptor, RpcLoggingInterceptor } from '@nftfi.api/core/interceptors';
import { RpcValidationPipe } from '@nftfi.api/core/pipes';
import {
  getResponseArrayBodyDto,
  getResponsePaginatedBodyDto,
  ResponseArrayBody,
  ResponseErrorsDto
} from '@nftfi.api/core/dtos';
import { httpValidationPipe } from '@nftfi.api/validation/api-validation.pipe';
import { HttpToRpcExceptionFilter } from '@nftfi.api/core/filters';
import { RPCResponse } from '@nftfi.api/facades/queue';
import {
  AssetKeyDto,
  AssetsQueueTopic,
  CollectionDto,
  CollectionProjection,
  CollectionQueryDto,
  GetCollectionsByKeysDto,
  GetCollectionsParamsDto
} from '@nftfi.api/facades/assets';
import { CollectionService } from './collection.service';

const ResponseGetCollectionsDto = getResponseArrayBodyDto(CollectionDto);
const ResponseGetPaginatedCollectionsDto = getResponsePaginatedBodyDto(CollectionDto);
const GetCollectionsCacheTTL = 1000 * 60 * 5; // 5 minutes

@Controller()
@ApiTags('collections')
@ApiSecurity('api-key')
export class CollectionController {
  constructor(private readonly service: CollectionService) {}

  @Get('/collections')
  @ApiOperation({ operationId: 'CollectionController_handleGetMany' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ok', type: ResponseGetCollectionsDto })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Validation Error', type: ResponseErrorsDto })
  @CacheTTL(GetCollectionsCacheTTL)
  @SerializeOptions({ excludeExtraneousValues: true })
  @UseInterceptors(CacheInterceptor, ClassSerializerInterceptor)
  async handleGetMany(@Query(httpValidationPipe) query: CollectionQueryDto): Promise<ResponseArrayBody<CollectionDto>> {
    const [collections, count] = await Promise.all([this.service.getMany(query), this.service.count(query)]);
    const dtos = await this.service.toDtos(collections, { projection: query.projection || [] });
    return new ResponseGetPaginatedCollectionsDto(dtos, count);
  }

  @Get('/collections/:contract')
  @ApiParam({ name: 'contract', type: String })
  @ApiOperation({ operationId: 'CollectionController_handleGet' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ok', type: ResponseGetCollectionsDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Not Found' })
  @CacheTTL(GetCollectionsCacheTTL)
  @SerializeOptions({ excludeExtraneousValues: true })
  @UseInterceptors(CacheInterceptor, ClassSerializerInterceptor)
  async handleGet(@Param('contract') contract: string): Promise<ResponseArrayBody<CollectionDto>> {
    const collections = await this.service.getByContract(contract);
    const dtos = await this.service.toDtos(collections, { projection: [CollectionProjection.FloorPrice] });
    return new ResponseGetCollectionsDto(dtos);
  }

  @CacheTTL(GetCollectionsCacheTTL)
  @SerializeOptions({ excludeExtraneousValues: true })
  @UseFilters(HttpToRpcExceptionFilter)
  @UseInterceptors(RpcLoggingInterceptor, RpcCacheInterceptor, ClassSerializerInterceptor)
  @MessagePattern(AssetsQueueTopic.GetCollectionsByContract)
  async handleGetMessage(@Payload() { contract }: GetCollectionsParamsDto): Promise<RPCResponse<CollectionDto[]>> {
    const collections = await this.service.getByContract(contract);
    return { data: await this.service.toDtos(collections, { projection: [CollectionProjection.FloorPrice] }) };
  }

  @CacheTTL(GetCollectionsCacheTTL)
  @SerializeOptions({ excludeExtraneousValues: true })
  @UseFilters(HttpToRpcExceptionFilter)
  @UsePipes(RpcValidationPipe)
  @UseInterceptors(RpcLoggingInterceptor, RpcCacheInterceptor, ClassSerializerInterceptor)
  @MessagePattern(AssetsQueueTopic.GetCollectionByKey)
  async handleGetByKeyMessage(@Payload() { contract, tokenId }: AssetKeyDto): Promise<RPCResponse<CollectionDto>> {
    const collection = await this.service.getByKey(contract, tokenId);
    return { data: collection ? await this.service.toDto(collection, { projection: [] }) : null };
  }

  @CacheTTL(GetCollectionsCacheTTL)
  @SerializeOptions({ excludeExtraneousValues: true })
  @UseFilters(HttpToRpcExceptionFilter)
  @UsePipes(RpcValidationPipe)
  @UseInterceptors(RpcLoggingInterceptor, RpcCacheInterceptor, ClassSerializerInterceptor)
  @MessagePattern(AssetsQueueTopic.GetCollections)
  async handleGetByKeysMessage(@Payload() params: GetCollectionsByKeysDto): Promise<RPCResponse<CollectionDto[]>> {
    const collections = await this.service.getByKeys(params.keys);
    return {
      data: await this.service.toDtos(collections, { projection: params.projection })
    };
  }
}
