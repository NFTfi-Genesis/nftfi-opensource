export enum Functions {
  GetProtocolFee = 'getProtocolFee'
}

export interface GetProtocolFeeResult {
  recipient: string; // '0xD07a25E6a22e9158162699490Aa6A9464E14c50a',
  fraction: string; // '0'
}

interface LoanV1Souce {
  loanId: string;
  lender: string;
  principalAmount: string;
  accruedInterest: string;
  startTime: string;
  aprBps: string;
}

export interface LoanV1 {
  borrower: string;
  nftCollateralTokenId: string;
  nftCollateralAddress: string;
  principalAddress: string;
  principalAmount: string;
  startTime: string;
  duration: string;
  source: LoanV1Souce[];
}

export interface LoanV1StartedPayload {
  loanId: string;
  offerId: string;
  fee?: string; // in wei
  loan: LoanV1;
}

export interface LoanV1RefinancedPayload {
  renegotiationId: string;
  oldLoanId: string;
  newLoanId: string;
  fee?: string; // in wei
  loan: LoanV1;
}

export interface LoanV1RepaidPayload {
  loanId: string;
  totalRepayment: string;
  fee: string;
}

export interface LoanV1LiquidatedPayload {
  loanId: string;
}
