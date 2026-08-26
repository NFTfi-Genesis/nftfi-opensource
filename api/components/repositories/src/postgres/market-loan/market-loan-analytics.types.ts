import { MarketLoanProtocol } from './market-loan.types';

export interface AnalyticsFilter {
  daysFromNow?: number;
  protocols?: MarketLoanProtocol[];
  currencies?: string[];
  wallets?: string[];
  lender?: string;
  borrower?: string;
  collectionIds?: number[];
}

export interface AnalyticsPagination {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export enum AnalyticsSortBy {
  Address = 'address',
  TotalUsdValue = 'totalUsdValue',
  AvgUsdValue = 'avgUsdValue',
  AvgApr = 'avgApr',
  LoanCount = 'loanCount'
}

export interface ProtocolBreakdownRow {
  protocol: string;
  total: string;
}

export interface CurrencyBreakdownRow {
  currency: string;
  total_usd: string;
  total_native: string;
}

export interface CountRow {
  total: string | null;
}

export interface StatsByBorrowerRow {
  borrower: string;
  total_usd_value: string;
  avg_usd_value: string;
  avg_apr: string;
  loan_count: string;
}

export interface ProtocolBreakdownItem {
  protocol: string;
  total: number;
}

export interface CurrencyBreakdownItem {
  currency: string;
  totalUsd: number;
  totalNative: number;
}

export interface StatsByBorrowerItem {
  borrower: string;
  totalUsdValue: number;
  avgUsdValue: number;
  avgApr: number;
  loanCount: number;
}

export interface StatsByLenderRow {
  lender: string;
  total_usd_value: string;
  avg_usd_value: string;
  avg_apr: string;
  loan_count: string;
}

export interface StatsByLenderItem {
  lender: string;
  totalUsdValue: number;
  avgUsdValue: number;
  avgApr: number;
  loanCount: number;
}

export interface StatsByDayRow {
  due_day: string;
  total_usd_value: string;
  avg_usd_value: string;
  avg_apr: string;
  loan_count: string;
}

export interface StatsByDayItem {
  dueDay: string;
  totalUsdValue: number;
  avgUsdValue: number;
  avgApr: number;
  loanCount: number;
}

export interface StatsByWalletRow {
  wallet: string;
  lender_loans_count: string;
  borrower_loans_count: string;
  lender_total_amount_usd: string;
  borrower_total_amount_usd: string;
}

export interface StatsByWalletItem {
  wallet: string;
  lenderLoansCount: number;
  borrowerLoansCount: number;
  lenderTotalAmountUsd: number;
  borrowerTotalAmountUsd: number;
}

export interface StatsByCollectionRow {
  collection_id: string;
  collection_name: string;
  collection_image_url: string | null;
  total_usd_value: string;
  avg_usd_value: string;
  avg_apr: string;
  loan_count: string;
  percentage_of_total: string;
}

export interface StatsByCollectionItem {
  collectionId: number;
  collectionName: string;
  collectionImageUrl: string | null;
  totalUsdValue: number;
  avgUsdValue: number;
  avgApr: number;
  loanCount: number;
  percentageOfTotal: number;
}

export interface SummaryItem {
  totalUsdValue: number;
  totalRepaymentUsd: number;
  avgUsdValue: number;
  avgApr: number;
  weightedAvgApr: number;
  weightedAvgDuration: number;
  loanCount: number;
  lendedLoansCount: number;
  borrowedLoansCount: number;
  totalEthValueOfEthLoans: number;
  totalUsdValueOfUsdLoans: number;
  totalInterestEthOfEthLoans: number;
  totalInterestUsdOfUsdLoans: number;
  totalPrincipalEthOfEthLoans: number;
  totalPrincipalUsdOfUsdLoans: number;
}
