import { isNumber } from 'lodash';
import { Brackets, Repository as RepositoryType, SelectQueryBuilder } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SupportedCurrencies, Ticker } from '@nftfi.api/core';
import { type FxRateConfig, FxRateConfigToken } from '@nftfi.api/modules/fx-rate-provider';
import { COLLECTION_TABLE_NAME } from '../collection/collection.types';
import { Repository } from '../repository';
import { MarketLoan } from './market-loan.entity';
import { MarketLoanStatus } from './market-loan.types';
import {
  AnalyticsFilter,
  AnalyticsPagination,
  AnalyticsSortBy,
  CountRow,
  CurrencyBreakdownItem,
  CurrencyBreakdownRow,
  StatsByDayItem,
  StatsByDayRow,
  ProtocolBreakdownItem,
  ProtocolBreakdownRow,
  StatsByBorrowerItem,
  StatsByBorrowerRow,
  StatsByCollectionItem,
  StatsByCollectionRow,
  StatsByLenderItem,
  StatsByLenderRow,
  StatsByWalletItem,
  StatsByWalletRow,
  SummaryItem
} from './market-loan-analytics.types';

@Injectable()
export class MarketLoanAnalyticsRepository extends Repository {
  private readonly alias = 'ml';
  private readonly collectionAssetAlias = 'ca';

  constructor(
    @InjectRepository(MarketLoan) private readonly model: RepositoryType<MarketLoan>,
    private readonly supportedCurrencies: SupportedCurrencies,
    @Inject(FxRateConfigToken) private readonly fxConfig: FxRateConfig
  ) {
    super();
  }

  async getProtocolBreakdown(filter: AnalyticsFilter): Promise<ProtocolBreakdownItem[]> {
    const a = this.alias;
    const qb = this.model.createQueryBuilder(a);
    qb.select(`"${a}"."protocol"`, 'protocol');
    qb.addSelect(`COALESCE(SUM(${this.fxUsdExpression(qb, 'repayment_max_eth')}), 0)`, 'total');
    this.applyFilters(qb, filter);
    qb.groupBy(`"${a}"."protocol"`);

    const rows = await qb.getRawMany<ProtocolBreakdownRow>();
    return rows.map(row => ({
      protocol: row.protocol,
      total: parseFloat(row.total) || 0
    }));
  }

  async getCurrencyBreakdown(filter: AnalyticsFilter): Promise<CurrencyBreakdownItem[]> {
    const a = this.alias;
    const qb = this.model.createQueryBuilder(a);
    qb.select(`"${a}"."currency"`, 'currency');
    qb.addSelect(`COALESCE(SUM(${this.fxUsdExpression(qb, 'repayment_max_eth')}), 0)`, 'total_usd');
    qb.addSelect(`COALESCE(SUM("${a}"."repayment_max_eth"), 0)`, 'total_native');
    this.applyFilters(qb, filter);
    qb.groupBy(`"${a}"."currency"`);

    const rows = await qb.getRawMany<CurrencyBreakdownRow>();
    return rows.map(row => ({
      currency: row.currency,
      totalUsd: parseFloat(row.total_usd) || 0,
      totalNative: parseFloat(row.total_native) || 0
    }));
  }

  async countStatsByBorrower(filter: AnalyticsFilter): Promise<number> {
    const a = this.alias;
    const qb = this.model.createQueryBuilder(a);
    qb.select(`COUNT(DISTINCT "${a}"."borrower")`, 'total');
    this.applyFilters(qb, filter);
    const row = await qb.getRawOne<CountRow>();
    return parseInt(row?.total ?? '', 10) || 0;
  }

  async getStatsByBorrower(filter: AnalyticsFilter, pagination: AnalyticsPagination): Promise<StatsByBorrowerItem[]> {
    const a = this.alias;
    const qb = this.model.createQueryBuilder(a);
    const usdExpr = this.fxUsdExpression(qb, 'repayment_max_eth');
    qb.select(`"${a}"."borrower"`, 'borrower');
    qb.addSelect(`COALESCE(SUM(${usdExpr}), 0)`, 'total_usd_value');
    qb.addSelect(`COALESCE(AVG(${usdExpr}), 0)`, 'avg_usd_value');
    qb.addSelect(`COALESCE(AVG("${a}"."apr"), 0)`, 'avg_apr');
    qb.addSelect(`COUNT(*)`, 'loan_count');
    this.applyFilters(qb, filter);
    qb.groupBy(`"${a}"."borrower"`);

    let sortCol = '';
    switch (pagination.sortBy) {
      case AnalyticsSortBy.Address:
        sortCol = `"${a}"."borrower"`;
        break;
      case AnalyticsSortBy.AvgUsdValue:
        sortCol = 'avg_usd_value';
        break;
      case AnalyticsSortBy.AvgApr:
        sortCol = 'avg_apr';
        break;
      case AnalyticsSortBy.LoanCount:
        sortCol = 'loan_count';
        break;
      case AnalyticsSortBy.TotalUsdValue:
      default:
        sortCol = 'total_usd_value';
        break;
    }
    qb.orderBy(sortCol, pagination.sortOrder || 'DESC');
    qb.limit(pagination.pageSize);
    qb.offset(pagination.page * pagination.pageSize);

    const rows = await qb.getRawMany<StatsByBorrowerRow>();
    return rows.map(row => ({
      borrower: row.borrower,
      totalUsdValue: parseFloat(row.total_usd_value) || 0,
      avgUsdValue: parseFloat(row.avg_usd_value) || 0,
      avgApr: parseFloat(row.avg_apr) || 0,
      loanCount: parseInt(row.loan_count, 10) || 0
    }));
  }

  async countStatsByLender(filter: AnalyticsFilter): Promise<number> {
    const a = this.alias;
    const qb = this.model.createQueryBuilder(a);
    qb.select(`COUNT(DISTINCT "${a}"."lender")`, 'total');
    this.applyFilters(qb, filter);
    const row = await qb.getRawOne<CountRow>();
    return parseInt(row?.total ?? '', 10) || 0;
  }

  async getStatsByLender(filter: AnalyticsFilter, pagination: AnalyticsPagination): Promise<StatsByLenderItem[]> {
    const a = this.alias;
    const qb = this.model.createQueryBuilder(a);
    const usdExpr = this.fxUsdExpression(qb, 'repayment_max_eth');
    qb.select(`"${a}"."lender"`, 'lender');
    qb.addSelect(`COALESCE(SUM(${usdExpr}), 0)`, 'total_usd_value');
    qb.addSelect(`COALESCE(AVG(${usdExpr}), 0)`, 'avg_usd_value');
    qb.addSelect(`COALESCE(AVG("${a}"."apr"), 0)`, 'avg_apr');
    qb.addSelect(`COUNT(*)`, 'loan_count');
    this.applyFilters(qb, filter);
    qb.groupBy(`"${a}"."lender"`);

    let sortCol = '';
    switch (pagination.sortBy) {
      case AnalyticsSortBy.Address:
        sortCol = `"${a}"."lender"`;
        break;
      case AnalyticsSortBy.AvgUsdValue:
        sortCol = 'avg_usd_value';
        break;
      case AnalyticsSortBy.AvgApr:
        sortCol = 'avg_apr';
        break;
      case AnalyticsSortBy.LoanCount:
        sortCol = 'loan_count';
        break;
      case AnalyticsSortBy.TotalUsdValue:
      default:
        sortCol = 'total_usd_value';
        break;
    }
    qb.orderBy(sortCol, pagination.sortOrder || 'DESC');
    qb.limit(pagination.pageSize);
    qb.offset(pagination.page * pagination.pageSize);

    const rows = await qb.getRawMany<StatsByLenderRow>();
    return rows.map(row => ({
      lender: row.lender,
      totalUsdValue: parseFloat(row.total_usd_value) || 0,
      avgUsdValue: parseFloat(row.avg_usd_value) || 0,
      avgApr: parseFloat(row.avg_apr) || 0,
      loanCount: parseInt(row.loan_count, 10) || 0
    }));
  }

  async getSummary(filter: AnalyticsFilter): Promise<SummaryItem> {
    const a = this.alias;
    const qb = this.model.createQueryBuilder(a);
    const repaymentUsdExpr = this.fxUsdExpression(qb, 'repayment_max_eth');
    const singleWallet =
      filter.lender || filter.borrower || (filter.wallets?.length === 1 ? filter.wallets[0] : undefined);

    qb.select(`COALESCE(SUM(${repaymentUsdExpr}), 0)`, 'total_usd_value');
    qb.addSelect(`COALESCE(SUM(${repaymentUsdExpr}), 0)`, 'total_repayment_usd');
    qb.addSelect(`COALESCE(AVG(${repaymentUsdExpr}), 0)`, 'avg_usd_value');
    qb.addSelect(`COALESCE(AVG("${a}"."apr"), 0)`, 'avg_apr');
    qb.addSelect(
      `CASE WHEN SUM(${repaymentUsdExpr}) > 0 THEN SUM("${a}"."apr" * ${repaymentUsdExpr}) / SUM(${repaymentUsdExpr}) ELSE 0 END`,
      'weighted_avg_apr'
    );
    // Perpetual loans (Blur Blend) carry duration=0 and dueAt=NULL — excluding them keeps the
    // weighted average meaningful for fixed-maturity loans.
    qb.addSelect(
      `CASE WHEN SUM(${repaymentUsdExpr}) FILTER (WHERE "${a}"."due_at" IS NOT NULL) > 0 ` +
        `THEN SUM(("${a}"."duration" / 86400.0) * ${repaymentUsdExpr}) FILTER (WHERE "${a}"."due_at" IS NOT NULL) ` +
        `/ SUM(${repaymentUsdExpr}) FILTER (WHERE "${a}"."due_at" IS NOT NULL) ` +
        `ELSE 0 END`,
      'weighted_avg_duration'
    );
    qb.addSelect(`COUNT(*)`, 'loan_count');

    if (singleWallet) {
      qb.addSelect(`SUM(CASE WHEN "${a}"."lender" = :singleWallet THEN 1 ELSE 0 END)`, 'lended_loans_count');
      qb.addSelect(`SUM(CASE WHEN "${a}"."borrower" = :singleWallet THEN 1 ELSE 0 END)`, 'borrowed_loans_count');
      qb.setParameter('singleWallet', singleWallet);
    } else {
      qb.addSelect(`0`, 'lended_loans_count');
      qb.addSelect(`0`, 'borrowed_loans_count');
    }

    const ethCurrency = this.supportedCurrencies.getByTicker(Ticker.WETH).contractAddress;
    const daiCurrency = this.supportedCurrencies.getByTicker(Ticker.DAI).contractAddress;
    const usdcCurrency = this.supportedCurrencies.getByTicker(Ticker.USDC).contractAddress;

    qb.addSelect(
      `COALESCE(SUM(CASE WHEN "${a}"."currency" = :ethCurrency THEN "${a}"."repayment_max_eth" ELSE 0 END), 0)`,
      'total_eth_value_of_eth_loans'
    );
    qb.addSelect(
      `COALESCE(SUM(CASE WHEN "${a}"."currency" = :ethCurrency THEN "${a}"."interest_eth" ELSE 0 END), 0)`,
      'total_interest_eth_of_eth_loans'
    );
    qb.addSelect(
      `COALESCE(SUM(CASE WHEN "${a}"."currency" = :ethCurrency THEN "${a}"."principal_eth" ELSE 0 END), 0)`,
      'total_principal_eth_of_eth_loans'
    );
    qb.setParameter('ethCurrency', ethCurrency);

    qb.addSelect(
      `COALESCE(SUM(CASE WHEN "${a}"."currency" IN (:...usdCurrencies) THEN ${repaymentUsdExpr} ELSE 0 END), 0)`,
      'total_usd_value_of_usd_loans'
    );
    qb.addSelect(
      `COALESCE(SUM(CASE WHEN "${a}"."currency" IN (:...usdCurrencies) THEN "${a}"."interest_usd" ELSE 0 END), 0)`,
      'total_interest_usd_of_usd_loans'
    );
    qb.addSelect(
      `COALESCE(SUM(CASE WHEN "${a}"."currency" IN (:...usdCurrencies) THEN "${a}"."principal_usd" ELSE 0 END), 0)`,
      'total_principal_usd_of_usd_loans'
    );
    qb.setParameter('usdCurrencies', [daiCurrency, usdcCurrency]);

    this.applyFilters(qb, filter);

    const row = await qb.getRawOne();
    return {
      totalUsdValue: parseFloat(row?.total_usd_value) || 0,
      totalRepaymentUsd: parseFloat(row?.total_repayment_usd) || 0,
      avgUsdValue: parseFloat(row?.avg_usd_value) || 0,
      avgApr: parseFloat(row?.avg_apr) || 0,
      weightedAvgApr: parseFloat(row?.weighted_avg_apr) || 0,
      weightedAvgDuration: parseFloat(row?.weighted_avg_duration) || 0,
      loanCount: parseInt(row?.loan_count, 10) || 0,
      lendedLoansCount: parseInt(row?.lended_loans_count, 10) || 0,
      borrowedLoansCount: parseInt(row?.borrowed_loans_count, 10) || 0,
      totalEthValueOfEthLoans: parseFloat(row?.total_eth_value_of_eth_loans) || 0,
      totalUsdValueOfUsdLoans: parseFloat(row?.total_usd_value_of_usd_loans) || 0,
      totalInterestEthOfEthLoans: parseFloat(row?.total_interest_eth_of_eth_loans) || 0,
      totalInterestUsdOfUsdLoans: parseFloat(row?.total_interest_usd_of_usd_loans) || 0,
      totalPrincipalEthOfEthLoans: parseFloat(row?.total_principal_eth_of_eth_loans) || 0,
      totalPrincipalUsdOfUsdLoans: parseFloat(row?.total_principal_usd_of_usd_loans) || 0
    };
  }

  async getStatsByDay(filter: AnalyticsFilter, timezone: string = 'UTC'): Promise<StatsByDayItem[]> {
    const a = this.alias;
    const qb = this.model.createQueryBuilder(a);
    const repaymentUsdExpr = this.fxUsdExpression(qb, 'repayment_max_eth');
    qb.select(`DATE(("${a}"."due_at" AT TIME ZONE 'UTC') AT TIME ZONE :tz)`, 'due_day');
    qb.addSelect(`COALESCE(SUM(${repaymentUsdExpr}), 0)`, 'total_usd_value');
    qb.addSelect(`COALESCE(AVG(${repaymentUsdExpr}), 0)`, 'avg_usd_value');
    qb.addSelect(`COALESCE(AVG("${a}"."apr"), 0)`, 'avg_apr');
    qb.addSelect(`COUNT(*)`, 'loan_count');
    qb.setParameter('tz', timezone);
    this.applyFilters(qb, filter);
    qb.groupBy('due_day');
    qb.orderBy('due_day', 'ASC');

    const rows = await qb.getRawMany<StatsByDayRow>();
    return rows.map(row => ({
      dueDay: row.due_day,
      totalUsdValue: parseFloat(row.total_usd_value) || 0,
      avgUsdValue: parseFloat(row.avg_usd_value) || 0,
      avgApr: parseFloat(row.avg_apr) || 0,
      loanCount: parseInt(row.loan_count, 10) || 0
    }));
  }

  async countStatsByCollection(filter: AnalyticsFilter): Promise<number> {
    const a = this.alias;
    const qb = this.model.createQueryBuilder(a);
    this.joinCollectionAssets(qb);
    qb.innerJoin(COLLECTION_TABLE_NAME, 'c', `"c"."id" = "${this.collectionAssetAlias}"."collection_id"`);
    qb.select('COUNT(DISTINCT "c"."id")', 'total');
    this.applyFilters(qb, filter);
    const row = await qb.getRawOne<CountRow>();
    return parseInt(row?.total ?? '', 10) || 0;
  }

  async getStatsByCollection(
    filter: AnalyticsFilter,
    pagination: AnalyticsPagination
  ): Promise<StatsByCollectionItem[]> {
    const a = this.alias;
    const qb = this.model.createQueryBuilder(a);
    const usdExpr = this.fxUsdExpression(qb, 'repayment_max_eth');
    this.joinCollectionAssets(qb);
    qb.innerJoin(COLLECTION_TABLE_NAME, 'c', `"c"."id" = "${this.collectionAssetAlias}"."collection_id"`);
    qb.select('"c"."id"', 'collection_id');
    qb.addSelect('"c"."name"', 'collection_name');
    qb.addSelect('"c"."image_url"', 'collection_image_url');
    qb.addSelect(`COALESCE(SUM(${usdExpr}), 0)`, 'total_usd_value');
    qb.addSelect(`COALESCE(AVG(${usdExpr}), 0)`, 'avg_usd_value');
    qb.addSelect(`COALESCE(AVG("${a}"."apr"), 0)`, 'avg_apr');
    qb.addSelect('COUNT(*)', 'loan_count');
    qb.addSelect(`COALESCE(SUM(${usdExpr}) / NULLIF(SUM(SUM(${usdExpr})) OVER (), 0) * 100, 0)`, 'percentage_of_total');
    this.applyFilters(qb, filter);
    qb.groupBy('"c"."id"');
    qb.addGroupBy('"c"."name"');
    qb.addGroupBy('"c"."image_url"');
    qb.orderBy('total_usd_value', 'DESC');
    qb.limit(pagination.pageSize);
    qb.offset(pagination.page * pagination.pageSize);

    const rows = await qb.getRawMany<StatsByCollectionRow>();
    return rows.map(row => ({
      collectionId: parseInt(row.collection_id, 10) || 0,
      collectionName: row.collection_name,
      collectionImageUrl: row.collection_image_url,
      totalUsdValue: parseFloat(row.total_usd_value) || 0,
      avgUsdValue: parseFloat(row.avg_usd_value) || 0,
      avgApr: parseFloat(row.avg_apr) || 0,
      loanCount: parseInt(row.loan_count, 10) || 0,
      percentageOfTotal: parseFloat(row.percentage_of_total) || 0
    }));
  }

  async getStatsByWallet(wallet: string): Promise<StatsByWalletItem> {
    const a = this.alias;
    const lcWallet = wallet.toLowerCase();

    const qb = this.model.createQueryBuilder(a);
    const usdExpr = this.fxUsdExpression(qb, 'principal_eth');
    qb.select(`:wallet`, 'wallet');
    qb.addSelect(`COUNT(CASE WHEN "${a}"."lender" = :lcWallet THEN 1 END)`, 'lender_loans_count');
    qb.addSelect(`COUNT(CASE WHEN "${a}"."borrower" = :lcWallet THEN 1 END)`, 'borrower_loans_count');
    qb.addSelect(
      `COALESCE(SUM(CASE WHEN "${a}"."lender" = :lcWallet THEN ${usdExpr} ELSE 0 END), 0)`,
      'lender_total_amount_usd'
    );
    qb.addSelect(
      `COALESCE(SUM(CASE WHEN "${a}"."borrower" = :lcWallet THEN ${usdExpr} ELSE 0 END), 0)`,
      'borrower_total_amount_usd'
    );
    qb.setParameter('wallet', wallet);
    qb.setParameter('lcWallet', lcWallet);
    qb.andWhere(`"${a}"."status" = :statusFilter`, { statusFilter: MarketLoanStatus.Active });
    qb.andWhere(
      new Brackets(sub => {
        sub.where(`"${a}"."due_at" > NOW()`);
        sub.orWhere(`"${a}"."due_at" IS NULL`);
      })
    );
    qb.andWhere(
      new Brackets(sub => {
        sub.where(`"${a}"."lender" = :lcWallet`);
        sub.orWhere(`"${a}"."borrower" = :lcWallet`);
      })
    );

    const row = await qb.getRawOne<StatsByWalletRow>();
    return {
      wallet: row?.wallet ?? wallet,
      lenderLoansCount: parseInt(row?.lender_loans_count ?? '', 10) || 0,
      borrowerLoansCount: parseInt(row?.borrower_loans_count ?? '', 10) || 0,
      lenderTotalAmountUsd: parseFloat(row?.lender_total_amount_usd ?? '') || 0,
      borrowerTotalAmountUsd: parseFloat(row?.borrower_total_amount_usd ?? '') || 0
    };
  }

  private fxUsdExpression(qb: SelectQueryBuilder<MarketLoan>, ethColumn: string): string {
    const a = this.alias;
    const wethAddress = this.supportedCurrencies.getByTicker(Ticker.WETH).contractAddress;
    qb.setParameter('wethCurrency', wethAddress);
    qb.setParameter('ethUsdRate', this.fxConfig.ethusdt);
    return `CASE WHEN "${a}"."currency" = :wethCurrency THEN "${a}"."${ethColumn}" * :ethUsdRate ELSE "${a}"."${ethColumn}" END`;
  }

  private joinCollectionAssets(qb: SelectQueryBuilder<MarketLoan>): void {
    const a = this.alias;
    const hasCollectionAssetsJoin = qb.expressionMap.joinAttributes.some(
      joinAttribute => joinAttribute.alias.name === this.collectionAssetAlias
    );

    if (hasCollectionAssetsJoin) return;

    qb.innerJoin(`${a}.asset`, this.collectionAssetAlias);
  }

  private applyFilters(qb: SelectQueryBuilder<MarketLoan>, filter: AnalyticsFilter): void {
    const a = this.alias;
    qb.andWhere(`"${a}"."status" = :statusFilter`, { statusFilter: MarketLoanStatus.Active });

    if (isNumber(filter.daysFromNow)) {
      // daysFromNow scopes the result to a maturity window — perpetual loans (Blur Blend) have no
      // maturity and would silently widen the window if not excluded explicitly.
      const daysInterval = `${filter.daysFromNow} days`;
      qb.andWhere(`"${a}"."due_at" IS NOT NULL`);
      qb.andWhere(`"${a}"."due_at" BETWEEN NOW() AND NOW() + :daysInterval::interval`, { daysInterval });
    } else {
      qb.andWhere(
        new Brackets(sub => {
          sub.where(`"${a}"."due_at" > NOW()`);
          sub.orWhere(`"${a}"."due_at" IS NULL`);
        })
      );
    }

    if (filter.protocols?.length) {
      qb.andWhere(`"${a}"."protocol" IN (:...protocolsFilter)`, { protocolsFilter: filter.protocols });
    }

    if (filter.currencies?.length) {
      qb.andWhere(`"${a}"."currency" IN (:...currenciesFilter)`, { currenciesFilter: filter.currencies });
    }

    if (filter.wallets?.length) {
      const lcWallets = filter.wallets.map(w => w.toLowerCase());
      qb.andWhere(
        new Brackets(sub => {
          sub.where(`"${a}"."lender" IN (:...walletsFilter)`, { walletsFilter: lcWallets });
          sub.orWhere(`"${a}"."borrower" IN (:...walletsFilter)`, { walletsFilter: lcWallets });
        })
      );
    }

    if (filter.lender) {
      qb.andWhere(`"${a}"."lender" = :lenderFilter`, { lenderFilter: filter.lender });
    }

    if (filter.borrower) {
      qb.andWhere(`"${a}"."borrower" = :borrowerFilter`, { borrowerFilter: filter.borrower });
    }

    if (filter.collectionIds?.length) {
      this.joinCollectionAssets(qb);
      qb.andWhere(`"${this.collectionAssetAlias}"."collection_id" IN (:...collectionIdsFilter)`, {
        collectionIdsFilter: filter.collectionIds
      });
    }
  }
}
