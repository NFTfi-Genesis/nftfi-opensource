import {
  LoanV2LiquidatedPayload,
  LoanV2RenegotiatedPayload,
  LoanV2RepaidPayload,
  LoanV2StartedEventPayload,
  LoanV3StartedEventPayload
} from './nftfi-loan-contract.types';

export interface LoanSubscriberConfig {
  contracts: {
    refinance: string;
  };
}

export interface EventMetadata {
  eventId: string;
  tx: string;
  blockNumber: number;
  emittedAt: Date;
  contract: string;
}

export type LoanStartedMetadata = Pick<EventMetadata, 'eventId' | 'tx' | 'blockNumber' | 'contract'>;
export type LoanLiquidatedMetadata = Pick<EventMetadata, 'eventId' | 'tx' | 'contract' | 'emittedAt' | 'blockNumber'>;
export type LoanRenegotiatedMetadata = Pick<EventMetadata, 'eventId' | 'contract' | 'emittedAt' | 'blockNumber'>;
export type LoanRepaidMetadata = Pick<EventMetadata, 'eventId' | 'tx' | 'blockNumber' | 'contract' | 'emittedAt'>;
export type LoanRefinancedMetadata = Pick<EventMetadata, 'contract'>;

export type LoanRefinancedPayload = Pick<LoanV2StartedEventPayload, 'loanId' | 'borrower'>;
export type LoanStartedPayload = Pick<LoanV2StartedEventPayload, 'loanId' | 'lender' | 'borrower'> &
  Pick<
    LoanV2StartedEventPayload['loanTerms'],
    | 'loanStartTime'
    | 'loanDuration'
    | 'loanPrincipalAmount'
    | 'maximumRepaymentAmount'
    | 'loanERC20Denomination'
    | 'nftCollateralContract'
    | 'nftCollateralId'
    | 'loanAdminFeeInBasisPoints'
  > &
  Pick<LoanV3StartedEventPayload['loanTerms'], 'isProRata' | 'originationFee'>;
export type LoanLiquidatedPayload = Pick<LoanV2LiquidatedPayload, 'loanId'>;
export type LoanRepaidPayload = Pick<
  LoanV2RepaidPayload,
  'loanId' | 'borrower' | 'loanPrincipalAmount' | 'amountPaidToLender' | 'adminFee'
>;
export type LoanRenegotiatedPayload = Pick<
  LoanV2RenegotiatedPayload,
  'loanId' | 'newMaximumRepaymentAmount' | 'newLoanDuration'
> &
  Pick<LoanV3StartedEventPayload['loanTerms'], 'isProRata'>;

export interface LoanRefinancedEventPayload {
  oldLoanContract: string; // "0x55aa082CbD1Cbbd8E7AEC5eAd57c70c7Ea8983C1",
  oldLoanId: string; // 219,
  newLoanId: string; // 220,
}
