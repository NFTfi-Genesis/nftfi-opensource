export interface OnChainLoanTerms {
  collateralAddress: string;
  collateralId: string;
  principal: string;
  payableCurrency: string;
  durationSecs: number | string;
  interestRate: string;
  originationFee: string;
  startDate: string;
}

export interface LoanRefinancedPayload {
  oldLoanId: number;
  newLoanId: number;
}

export interface LoanStartedPayload {
  loanId: number;
  lender: string;
  borrower: string;
}

export interface LoanPayload {
  loanId: number;
}

interface OnChainLoan<D> {
  loanData: D;
}

export type OnChainLoanV2 = OnChainLoan<{
  state: number;
  numInstallmentsPaid: number;
  startDate: string; //'1659029448',
  terms: {
    durationSecs: number;
    deadline: number; // 1660180067,
    numInstallments: number;
    interestRate: string; // '10000000000000000000000',
    principal: string; // '1000000000000000',
    collateralAddress: string; // '0x6e9B4c2f6Bd57b7b924d29b5dcfCa1273Ecc94A2',
    collateralId: string; // '481829870909898004723536809324732457173059728386',
    payableCurrency: string; // '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
  };
  balance: string; // '1000000000000000',
  balancePaid: string; // '0',
  lateFeesAccrued: string; // '0'
}>;

export type OnChainLoanV3 = OnChainLoan<{
  state: number;
  startDate: string;
  terms: {
    collateralAddress: string;
    collateralId: string;
    proratedInterestRate: string;
    principal: string;
    durationSecs: string;
    payableCurrency: string;
    deadline: string;
    affiliateCode: string;
  };
  feeSnapshot: {
    lenderDefaultFee: number;
    lenderInterestFee: number;
    lenderPrincipalFee: number;
  };
}>;
