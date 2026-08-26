export enum Functions {
  GetProtocolFee = 'getProtocolFee'
}

export interface GetProtocolFeeResult {
  recipient: string; // '0xD07a25E6a22e9158162699490Aa6A9464E14c50a',
  fraction: string; // '0'
}

interface LoanV2Souce {
  loanId: string;
  lender: string;
  principalAmount: string;
  accruedInterest: string;
  startTime: string;
  aprBps: string;
}

export interface LoanV2 {
  borrower: string;
  nftCollateralTokenId: string;
  nftCollateralAddress: string;
  principalAddress: string;
  principalAmount: string;
  startTime: string;
  duration: string;
  source: LoanV2Souce[];
}

export interface LoanV2StartedPayload {
  loanId: string;
  offerId: string;
  lender: string;
  borrower: string;
  fee: string; // in wei
  loan: LoanV2;
}

export interface LoanV2RefinancedPayload {
  renegotiationId: string;
  oldLoanId: string;
  newLoanId: string;
  fee: string; // in wei
  loan: LoanV2;
}

export interface LoanV2RepaidPayload {
  loanId: string;
  totalRepayment: string;
  fee: string;
}

export interface LoanV2LiquidatedPayload {
  loanId: string;
}
