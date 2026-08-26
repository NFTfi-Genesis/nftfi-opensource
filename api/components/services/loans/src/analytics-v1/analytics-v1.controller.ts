import * as express from 'express';
import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpStatus,
  Query,
  Response,
  SerializeOptions,
  UseInterceptors
} from '@nestjs/common';
import { CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HttpCacheInterceptor } from '@nftfi.api/core/interceptors';
import { ApiPaginationHeaders, HttpResponseHeader } from '@nftfi.api/core/dtos';
import { LoansCacheScope } from '../loan-v1/loan-v1.types';
import { AnalyticsV1Service } from './analytics-v1.service';
import {
  AnalyticsV1QueryDto,
  AnalyticsV1PaginatedQueryDto,
  StatsByBorrowerQueryDto,
  StatsByBorrowerDto,
  StatsByLenderQueryDto,
  StatsByLenderDto,
  StatsByCollectionDto,
  StatsByWalletQueryDto,
  StatsByWalletDto,
  StatsByDayDto,
  StatsByDayQueryDto,
  ProtocolBreakdownDto,
  CurrencyBreakdownDto,
  SummaryDto
} from './dtos';

const CacheTTLMs = 1000 * 60 * 5; // 5 minutes

@CacheKey(LoansCacheScope)
@Controller('/v1/analytics')
@ApiTags('v1')
export class AnalyticsV1Controller {
  constructor(private readonly service: AnalyticsV1Service) {}

  @Get('/protocol-breakdown')
  @ApiOperation({ operationId: 'AnalyticsV1Controller_getProtocolBreakdown' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Protocol breakdown of active loans' })
  @CacheTTL(CacheTTLMs)
  @CacheKey('protocol-breakdown')
  @SerializeOptions({ excludeExtraneousValues: true })
  @UseInterceptors(HttpCacheInterceptor, ClassSerializerInterceptor)
  async getProtocolBreakdown(@Query() query: AnalyticsV1QueryDto): Promise<ProtocolBreakdownDto[]> {
    return this.service.getProtocolBreakdown(query);
  }

  @Get('/currency-breakdown')
  @ApiOperation({ operationId: 'AnalyticsV1Controller_getCurrencyBreakdown' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Currency breakdown of active loans' })
  @CacheTTL(CacheTTLMs)
  @CacheKey('currency-breakdown')
  @SerializeOptions({ excludeExtraneousValues: true })
  @UseInterceptors(HttpCacheInterceptor, ClassSerializerInterceptor)
  async getCurrencyBreakdown(@Query() query: AnalyticsV1QueryDto): Promise<CurrencyBreakdownDto[]> {
    return this.service.getCurrencyBreakdown(query);
  }

  @Get('/summary')
  @ApiOperation({ operationId: 'AnalyticsV1Controller_getSummary' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Aggregate summary of active loans' })
  @CacheTTL(CacheTTLMs)
  @CacheKey('summary')
  @SerializeOptions({ excludeExtraneousValues: true })
  @UseInterceptors(HttpCacheInterceptor, ClassSerializerInterceptor)
  async getSummary(@Query() query: AnalyticsV1QueryDto): Promise<SummaryDto> {
    return this.service.getSummary(query);
  }

  @Get('/stats-by-day')
  @ApiOperation({ operationId: 'AnalyticsV1Controller_getStatsByDay' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Active loans stats grouped by due day' })
  @CacheTTL(CacheTTLMs)
  @CacheKey('stats-by-day')
  @SerializeOptions({ excludeExtraneousValues: true })
  @UseInterceptors(HttpCacheInterceptor, ClassSerializerInterceptor)
  async getStatsByDay(@Query() query: StatsByDayQueryDto): Promise<StatsByDayDto[]> {
    return this.service.getStatsByDay(query);
  }

  @Get('/stats-by-borrower')
  @ApiOperation({ operationId: 'AnalyticsV1Controller_getStatsByBorrower' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Loans stats grouped by borrower', headers: ApiPaginationHeaders })
  @CacheTTL(CacheTTLMs)
  @CacheKey('stats-by-borrower')
  @SerializeOptions({ excludeExtraneousValues: true })
  @UseInterceptors(HttpCacheInterceptor, ClassSerializerInterceptor)
  async getStatsByBorrower(
    @Query() query: StatsByBorrowerQueryDto,
    @Response({ passthrough: true }) res: express.Response
  ): Promise<StatsByBorrowerDto[]> {
    const [rows, total] = await Promise.all([
      this.service.getStatsByBorrower(query),
      this.service.countStatsByBorrower(query)
    ]);

    res.setHeader(HttpResponseHeader.PaginationPage, query.page.toString());
    res.setHeader(HttpResponseHeader.PaginationLimit, query.limit.toString());
    res.setHeader(HttpResponseHeader.PaginationTotal, total.toString());
    return rows;
  }

  @Get('/stats-by-lender')
  @ApiOperation({ operationId: 'AnalyticsV1Controller_getStatsByLender' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Loans stats grouped by lender', headers: ApiPaginationHeaders })
  @CacheTTL(CacheTTLMs)
  @CacheKey('stats-by-lender')
  @SerializeOptions({ excludeExtraneousValues: true })
  @UseInterceptors(HttpCacheInterceptor, ClassSerializerInterceptor)
  async getStatsByLender(
    @Query() query: StatsByLenderQueryDto,
    @Response({ passthrough: true }) res: express.Response
  ): Promise<StatsByLenderDto[]> {
    const [rows, total] = await Promise.all([
      this.service.getStatsByLender(query),
      this.service.countStatsByLender(query)
    ]);

    res.setHeader(HttpResponseHeader.PaginationPage, query.page.toString());
    res.setHeader(HttpResponseHeader.PaginationLimit, query.limit.toString());
    res.setHeader(HttpResponseHeader.PaginationTotal, total.toString());
    return rows;
  }

  @Get('/stats-by-collection')
  @ApiOperation({ operationId: 'AnalyticsV1Controller_getStatsByCollection' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Loans stats grouped by collection',
    headers: ApiPaginationHeaders
  })
  @CacheTTL(CacheTTLMs)
  @CacheKey('stats-by-collection')
  @SerializeOptions({ excludeExtraneousValues: true })
  @UseInterceptors(HttpCacheInterceptor, ClassSerializerInterceptor)
  async getStatsByCollection(
    @Query() query: AnalyticsV1PaginatedQueryDto,
    @Response({ passthrough: true }) res: express.Response
  ): Promise<StatsByCollectionDto[]> {
    const [rows, total] = await Promise.all([
      this.service.getStatsByCollection(query),
      this.service.countStatsByCollection(query)
    ]);

    res.setHeader(HttpResponseHeader.PaginationPage, query.page.toString());
    res.setHeader(HttpResponseHeader.PaginationLimit, query.limit.toString());
    res.setHeader(HttpResponseHeader.PaginationTotal, total.toString());
    return rows;
  }

  @Get('/stats-by-wallet')
  @ApiOperation({ operationId: 'AnalyticsV1Controller_getStatsByWallet' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Loans stats for a single wallet' })
  @CacheTTL(CacheTTLMs)
  @CacheKey('stats-by-wallet')
  @SerializeOptions({ excludeExtraneousValues: true })
  @UseInterceptors(HttpCacheInterceptor, ClassSerializerInterceptor)
  async getStatsByWallet(@Query() query: StatsByWalletQueryDto): Promise<StatsByWalletDto> {
    return this.service.getStatsByWallet(query);
  }
}
