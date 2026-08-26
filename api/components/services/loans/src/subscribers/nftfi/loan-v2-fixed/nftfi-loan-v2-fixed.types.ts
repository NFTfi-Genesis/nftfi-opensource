interface LoanPayload {
  loanId: string;
  borrower: string;
  lender: string;
}

interface AssetPayload {
  nftCollateralId: string;
  nftCollateralContract: string;
}

export interface LoanV2StartedPayload extends LoanPayload {
  loanTerms: AssetPayload & {
    loanPrincipalAmount: string;
    maximumRepaymentAmount: string;
    loanERC20Denomination: string;
    loanDuration: number;
    loanInterestRateForDurationInBasisPoints: number;
    loanAdminFeeInBasisPoints: number;
    nftCollateralWrapper: string;
    loanStartTime: string;
    borrower: string;
  };
  loanExtras: {
    revenueSharePartner: string;
    revenueShareInBasisPoints: number;
    referralFeeInBasisPoints: number;
  };
}

export interface LoanV2LiquidatedPayload extends LoanPayload, AssetPayload {
  loanPrincipalAmount: string;
  loanMaturityDate: string;
  loanLiquidationDate: string;
}

export interface LoanV2RepaidPayload extends LoanPayload, AssetPayload {
  loanPrincipalAmount: string;
  amountPaidToLender: string;
  adminFee: string;
  revenueShare: string;
  revenueSharePartner: string;
  loanERC20Denomination: string;
}

export interface LoanV2RenegotiatedPayload extends LoanPayload {
  newLoanDuration: number;
  newMaximumRepaymentAmount: string;
  renegotiationFee: string;
  renegotiationAdminFee: string;
}
