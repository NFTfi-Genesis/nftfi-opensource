import * as express from 'express';
import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpStatus,
  Query,
  Response,
  SerializeOptions,
  UseFilters,
  UseInterceptors,
  UsePipes
} from '@nestjs/common';
import { CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { MessagePattern } from '@nestjs/microservices';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoansQueueTopic } from '@nftfi.api/facades/loans';
import { RPCResponse } from '@nftfi.api/facades/queue';
import { HttpCacheInterceptor, RpcLoggingInterceptor } from '@nftfi.api/core/interceptors';
import { RpcValidationPipe } from '@nftfi.api/core/pipes';
import { HttpToRpcExceptionFilter } from '@nftfi.api/core/filters';
import { ApiPaginationHeaders, ResponseErrorsDto, HttpResponseHeader } from '@nftfi.api/core/dtos';
import { LoanV1Service } from './loan-v1.service';
import { LoanV1Dto, LoanV1GetQueryDto } from './dtos';
import { LoansCacheScope } from './loan-v1.types';

const GetCacheTTL = 1000 * 60; // 1 minute

@CacheKey(LoansCacheScope)
@Controller('/v1/loans')
@ApiTags('v1')
export class LoanV1Controller {
  constructor(private readonly loanService: LoanV1Service) {}

  @Get()
  @ApiOperation({ operationId: 'LoanV1Controller_handleGet' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ok', type: [LoanV1Dto], headers: ApiPaginationHeaders })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Validation error', type: ResponseErrorsDto })
  @CacheTTL(GetCacheTTL)
  @CacheKey('get-many')
  @SerializeOptions({ excludeExtraneousValues: true })
  @UseInterceptors(HttpCacheInterceptor, ClassSerializerInterceptor)
  async handleGet(
    @Query() query: LoanV1GetQueryDto,
    @Response({ passthrough: true }) res: express.Response
  ): Promise<LoanV1Dto[]> {
    const [loans, total] = await Promise.all([this.loanService.getMany(query), this.loanService.count(query)]);
    const dtos = await this.loanService.toDtos(loans);

    res.setHeader(HttpResponseHeader.PaginationPage, query.page.toString());
    res.setHeader(HttpResponseHeader.PaginationLimit, query.limit.toString());
    res.setHeader(HttpResponseHeader.PaginationTotal, total.toString());
    return dtos;
  }

  @SerializeOptions({ excludeExtraneousValues: true })
  @UseFilters(HttpToRpcExceptionFilter)
  @UsePipes(RpcValidationPipe)
  @UseInterceptors(RpcLoggingInterceptor, ClassSerializerInterceptor)
  @MessagePattern(LoansQueueTopic.InvalidateCache)
  async handleInvalidateCacheMessage(): Promise<RPCResponse<void>> {
    await this.loanService.invalidateCache();
    return { data: undefined };
  }
}
