import { CollectionAsset } from '../collection-asset';
import { MarketLoan } from './market-loan.entity';

export const MARKET_LOAN_TABLE_NAME = 'market_loans';

export type FindConditions = Pick<MarketLoan, 'borrower' | 'lender'> & {
  statuses?: MarketLoanStatus[];
  collectionIds?: number[];
  currencies?: string[];
  wallets?: string[];
  dueAtBefore?: Date;
  protocols?: MarketLoanProtocol[];
  nftContracts?: string[];
  nftIds?: string[];
};

export type MarketLoanSortKeys = Pick<
  MarketLoan,
  | 'protocol'
  | 'principal'
  | 'repayment'
  | 'repaymentMax'
  | 'apr'
  | 'duration'
  | 'startedAt'
  | 'dueAt'
  | 'lender'
  | 'borrower'
> & {
  collectionName?: string;
};

export enum MarketLoanStatus {
  Active = 'active',
  Repaid = 'repaid',
  Defaulted = 'defaulted',
  Liquidated = 'liquidated'
}

export enum MarketLoanProtocol {
  Nftfi = 'nftfi',
  Arcade = 'arcade',
  Blur = 'blur',
  Gondi = 'gondi'
}

export type MarketLoanWeiAmounts = Pick<
  MarketLoan,
  'principal' | 'repayment' | 'repaymentMax' | 'interest' | 'originationFee' | 'adminFee'
>;
export type MarketLoanUsdAmounts = Pick<
  MarketLoan,
  'principalUsd' | 'repaymentUsd' | 'repaymentMaxUsd' | 'interestUsd' | 'originationFeeUsd' | 'adminFeeUsd'
>;
export type MarketLoanEthAmounts = Pick<
  MarketLoan,
  'principalEth' | 'repaymentEth' | 'repaymentMaxEth' | 'interestEth' | 'originationFeeEth' | 'adminFeeEth'
>;

export type MarketLoanAmounts = MarketLoanWeiAmounts & MarketLoanEthAmounts & MarketLoanUsdAmounts;

export type DraftMarketLoan = Pick<
  MarketLoan,
  | 'loanId'
  | 'contract'
  | 'protocol'
  | 'status'
  | 'borrower'
  | 'lender'
  | 'currency'
  | 'nftContract'
  | 'nftTokenId'
  | 'apr'
  | 'eapr'
  | 'prorated'
  | 'duration'
  | 'startedAt'
  | 'startedTx'
  | 'dueAt'
  | 'endedAt'
  | 'endedTx'
> &
  MarketLoanAmounts & { asset: Pick<CollectionAsset, 'id'> };
