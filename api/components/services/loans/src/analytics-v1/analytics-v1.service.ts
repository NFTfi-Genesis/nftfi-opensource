import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  MarketLoanAnalyticsRepository,
  AnalyticsFilter,
  AnalyticsPagination
} from '@nftfi.api/repositories/postgres/market-loan';
import { SortDirection } from '@nftfi.api/validation';
import {
  AnalyticsV1PaginatedQueryDto,
  AnalyticsV1QueryDto,
  StatsByBorrowerQueryDto,
  StatsByLenderQueryDto,
  StatsByLenderDto,
  StatsByWalletQueryDto,
  ProtocolBreakdownDto,
  CurrencyBreakdownDto,
  StatsByBorrowerDto,
  StatsByCollectionDto,
  StatsByWalletDto,
  StatsByDayQueryDto,
  StatsByDayDto,
  SummaryDto
} from './dtos';

@Injectable()
export class AnalyticsV1Service {
  constructor(private readonly analyticsRepository: MarketLoanAnalyticsRepository) {}

  async getProtocolBreakdown(query: AnalyticsV1QueryDto): Promise<ProtocolBreakdownDto[]> {
    const items = await this.analyticsRepository.getProtocolBreakdown(this.buildFilter(query));
    return plainToInstance(ProtocolBreakdownDto, items);
  }

  async getCurrencyBreakdown(query: AnalyticsV1QueryDto): Promise<CurrencyBreakdownDto[]> {
    const items = await this.analyticsRepository.getCurrencyBreakdown(this.buildFilter(query));
    return plainToInstance(CurrencyBreakdownDto, items);
  }

  async getStatsByBorrower(query: StatsByBorrowerQueryDto): Promise<StatsByBorrowerDto[]> {
    const items = await this.analyticsRepository.getStatsByBorrower(
      this.buildFilter(query),
      this.buildPaginationAndSortBy(query)
    );
    return plainToInstance(StatsByBorrowerDto, items);
  }

  async countStatsByBorrower(query: StatsByBorrowerQueryDto): Promise<number> {
    return this.analyticsRepository.countStatsByBorrower(this.buildFilter(query));
  }

  async getStatsByLender(query: StatsByLenderQueryDto): Promise<StatsByLenderDto[]> {
    const items = await this.analyticsRepository.getStatsByLender(
      this.buildFilter(query),
      this.buildPaginationAndSortBy(query)
    );
    return plainToInstance(StatsByLenderDto, items);
  }

  async countStatsByLender(query: StatsByLenderQueryDto): Promise<number> {
    return this.analyticsRepository.countStatsByLender(this.buildFilter(query));
  }

  async getStatsByCollection(query: AnalyticsV1PaginatedQueryDto): Promise<StatsByCollectionDto[]> {
    const items = await this.analyticsRepository.getStatsByCollection(
      this.buildFilter(query),
      this.buildPagination(query)
    );
    return plainToInstance(StatsByCollectionDto, items);
  }

  async countStatsByCollection(query: AnalyticsV1PaginatedQueryDto): Promise<number> {
    return this.analyticsRepository.countStatsByCollection(this.buildFilter(query));
  }

  async getStatsByWallet(query: StatsByWalletQueryDto): Promise<StatsByWalletDto> {
    const item = await this.analyticsRepository.getStatsByWallet(query.wallet);
    return plainToInstance(StatsByWalletDto, item);
  }

  async getSummary(query: AnalyticsV1QueryDto): Promise<SummaryDto> {
    const item = await this.analyticsRepository.getSummary(this.buildFilter(query));
    return plainToInstance(SummaryDto, item);
  }

  async getStatsByDay(query: StatsByDayQueryDto): Promise<StatsByDayDto[]> {
    const items = await this.analyticsRepository.getStatsByDay(this.buildFilter(query), query.timezone);
    return plainToInstance(StatsByDayDto, items);
  }

  private buildFilter(query: AnalyticsV1QueryDto): AnalyticsFilter {
    return {
      daysFromNow: query.daysFromNow,
      protocols: query.protocols,
      currencies: query.currencies,
      wallets: query.wallets,
      lender: query.lender,
      borrower: query.borrower,
      collectionIds: query.collectionIds
    };
  }

  private buildPaginationAndSortBy(query: StatsByBorrowerQueryDto | StatsByLenderQueryDto): AnalyticsPagination {
    return {
      page: (query.page || 1) - 1,
      pageSize: query.limit || 100,
      sortBy: query.sortBy,
      sortOrder: query.sortDirection === SortDirection.Asc ? 'ASC' : 'DESC'
    };
  }

  private buildPagination(query: AnalyticsV1PaginatedQueryDto): AnalyticsPagination {
    return {
      page: (query.page || 1) - 1,
      pageSize: query.limit || 100
    };
  }
}
