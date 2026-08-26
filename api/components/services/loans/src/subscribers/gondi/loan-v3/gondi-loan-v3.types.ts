interface LoanV3Tranche {
  loanId: string;
  floor: string;
  principalAmount: string;
  lender: string;
  accruedInterest: string;
  startTime: string;
  aprBps: string;
}

interface LoanV3 {
  borrower: string;
  nftCollateralTokenId: string;
  nftCollateralAddress: string;
  principalAddress: string;
  principalAmount: string;
  startTime: string;
  duration: string;
  protocolFee: string;
  tranche: LoanV3Tranche[];
}

export interface LoanV3StartedPayload {
  loanId: string;
  offeId: string;
  fee: string;
  loan: LoanV3;
}

export interface LoanV3RefinancedPayload {
  renegotiationId: string;
  oldLoanId: string;
  newLoanId: string;
  fee: string;
  loan: LoanV3;
}

export interface LoanV3RefinancedNewOfferPayload {
  loanId: string;
  newLoanId: string;
  offerIds: string[];
  totalFee: string;
  loan: LoanV3;
}

export interface LoanV3RepaidPayload {
  loanId: string;
  totalRepayment: string;
  fee: string;
}

export interface LoanV3LiquidatedPayload {
  loanId: string;
}

export interface LoanV3ForeclosedPayload {
  loanId: string;
}
