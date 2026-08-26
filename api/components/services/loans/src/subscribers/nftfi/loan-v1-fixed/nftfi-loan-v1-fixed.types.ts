export interface LoanV1StartedPayload {
  loanId: string;
  borrower: string;
  lender: string;
  loanPrincipalAmount: string;
  maximumRepaymentAmount: string;
  nftCollateralId: string;
  loanStartTime: string;
  loanDuration: string;
  loanInterestRateForDurationInBasisPoints: string;
  nftCollateralContract: string;
  loanERC20Denomination: string;
  interestIsProRated: boolean;
}

export interface LoanV1LiquidatedPayload {
  loanId: string;
  borrower: string;
  lender: string;
  loanPrincipalAmount: string;
  nftCollateralId: string;
  loanMaturityDate: string;
  loanLiquidationDate: string;
  nftCollateralContract: string;
}

export interface LoanV1RepaidPayload {
  loanId: string;
  borrower: string;
  lender: string;
  loanPrincipalAmount: string;
  nftCollateralId: string;
  amountPaidToLender: string;
  adminFee: string;
  nftCollateralContract: string;
  loanERC20Denomination: string;
}
