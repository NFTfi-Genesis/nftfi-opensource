import { MarketLoanSortKeys } from '@nftfi.api/repositories/postgres/market-loan';

export enum LoanV02Status {
  Liquidated = 'liquidated',
  Active = 'active',
  Defaulted = 'defaulted',
  Repaid = 'repaid'
}

export type LoanV02SortBy = 'repayment' | 'interest' | 'apr' | 'duration' | 'dueDate' | 'nftName';
export type LoanV02SortDirection = 'asc' | 'desc';

export const LoanV02SortKeyMap: Record<LoanV02SortBy, keyof MarketLoanSortKeys> = {
  repayment: 'repaymentMax',
  interest: 'apr',
  apr: 'apr',
  duration: 'duration',
  dueDate: 'dueAt',
  nftName: 'collectionName'
};
