export interface LoanSource {
  lender: string;
  aprBps: string;
  principalAmount: string;
  accruedInterest: string;
}

export interface LoanPayload {
  borrower: string;
  startTime: string;
  duration: string;
  nftCollateralAddress: string;
  nftCollateralTokenId: string;
  principalAddress: string;
  principalAmount: string;
  sources: LoanSource[];
  feeAmount: string;
}

export type LoanStartedPayload = LoanPayload & {
  loanId: string;
};

export interface LoanRefinancedPayload extends LoanPayload {
  oldLoanId: string;
  newLoanId: string;
}

export interface LoanRepaidPayload {
  loanId: string;
  totalRepayment: string;
}

export interface LoanEndedPayload {
  loanId: string;
}
