interface LoanPayload {
  lienId: string;
  collection: string;
}

export interface LoanStartedPayload extends LoanPayload {
  lender: string;
  borrower: string;
  loanAmount: string;
  rate: string;
  tokenId: string;
}

export interface LoanRefinancedPayload extends LoanPayload {
  newLender: string;
  newAmount: string;
  newRate: string;
}

export type LoanRepaidPayload = LoanPayload;
export type LoanLiquidatedPayload = LoanPayload;
