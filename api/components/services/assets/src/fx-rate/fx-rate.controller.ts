import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpStatus,
  SerializeOptions,
  UseFilters,
  UseInterceptors
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { HttpToRpcExceptionFilter } from '@nftfi.api/core/filters';
import { RpcCacheInterceptor, RpcLoggingInterceptor } from '@nftfi.api/core/interceptors';
import { RPCResponse } from '@nftfi.api/facades/queue';
import { getResponseBodyDto, ResponseBody } from '@nftfi.api/core/dtos';
import {
  FxRateDto,
  FxRatesQueueTopic,
  FxSymbol,
  type GetToDateFxRateParamsDto,
  type GetLatestFxRateParamsDto
} from '@nftfi.api/facades/fx-rates';
import { FxRateService } from './fx-rate.service';

const GetCacheTTL = 1000 * 60;
const ResponseGetFxRateDto = getResponseBodyDto(FxRateDto);

@Controller()
export class FxRateController {
  constructor(private readonly service: FxRateService) {}

  @Get('/fx-rates/eth-usdt')
  @ApiOperation({ operationId: 'FxRateController_handleGetEthUsd' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ok', type: ResponseGetFxRateDto })
  @CacheTTL(GetCacheTTL)
  @SerializeOptions({ excludeExtraneousValues: true })
  @UseInterceptors(CacheInterceptor, ClassSerializerInterceptor)
  async handleGetEthUsd(): Promise<ResponseBody<FxRateDto>> {
    const rate = await this.service.getLatest(FxSymbol.ETH_USDT);
    return {
      result: rate ? this.service.toDto(rate) : null
    };
  }

  @CacheTTL(GetCacheTTL)
  @SerializeOptions({ excludeExtraneousValues: true })
  @UseFilters(HttpToRpcExceptionFilter)
  @UseInterceptors(RpcLoggingInterceptor, RpcCacheInterceptor, ClassSerializerInterceptor)
  @MessagePattern(FxRatesQueueTopic.GetLatest)
  async handleGetLatest(@Payload() { symbol }: GetLatestFxRateParamsDto): Promise<RPCResponse<FxRateDto>> {
    const data = await this.service.getLatest(symbol);
    return { data: data ? this.service.toDto(data) : null };
  }

  @CacheTTL(GetCacheTTL)
  @SerializeOptions({ excludeExtraneousValues: true })
  @UseFilters(HttpToRpcExceptionFilter)
  @UseInterceptors(RpcLoggingInterceptor, RpcCacheInterceptor, ClassSerializerInterceptor)
  @MessagePattern(FxRatesQueueTopic.GetAtDate)
  async handleGetAtDate(@Payload() { symbol, date }: GetToDateFxRateParamsDto): Promise<RPCResponse<FxRateDto>> {
    const data = await this.service.getAtDate(symbol, new Date(date));
    return { data: data ? this.service.toDto(data) : null };
  }
}
