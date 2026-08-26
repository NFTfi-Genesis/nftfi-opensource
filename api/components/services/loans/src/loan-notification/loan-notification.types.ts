import { SupportedCurrencies } from '@nftfi.api/core';
import { MarketLoan } from '@nftfi.api/repositories/postgres/market-loan';

export interface ServiceConfig {
  supportedCurrencies: SupportedCurrencies;
  nftfiDappUrl: string;
  nfts: {
    ignored: { address: string; tokenId: string }[];
  };
}

export enum EmailSubject {
  LoanStartedBorrower = 'NFTfi: Your loan has started',
  LoanStartedLender = 'NFTfi: Your offer has been accepted',
  LoanRepaidBorrower = 'NFTfi: Your loan has been repaid',
  LoanRepaidLender = 'NFTfi: Your loan has been repaid',
  LoanLiquidatedLender = 'NFTfi: Loan foreclosed',
  LoanLiquidatedBorrower = 'NFTfi: Loan foreclosed',
  LoanRenegotiatedLender = 'NFTfi: Your loan has been renegotiated',
  LoanRenegotiatedBorrower = 'NFTfi: Your loan has been renegotiated',
  LoansMaturityOnPlatform = 'NFTfi: Upcoming maturing loans on NFTfi',
  LoansMaturityByLender = 'NFTfi: Your Loans Are Approaching Maturity',
  LoansMaturityByBorrower = 'NFTfi: Loan repayment is due soon'
}

export type MaturingMarketLoan = MarketLoan & { maturingIn: number };
