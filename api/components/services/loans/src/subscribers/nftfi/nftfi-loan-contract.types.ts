interface LoanPayload {
  loanId: string; //1859,
  borrower: string; // "0x97B0E8F8D766Eb6e70B84287f52e6e8F260CE9E5",
  lender: string; // "0xca93f92f8B56CD3B08E4f353a729C905e05626c0",
}

interface AssetPayload {
  nftCollateralId: string; // "107",
  nftCollateralContract: string; // "0x576fe471011F1130342342e1bd539Df6408d8Fd6",
}

export interface LoanV2StartedEventPayload extends LoanPayload {
  loanTerms: AssetPayload & {
    loanPrincipalAmount: string; // "100000000000000000",
    maximumRepaymentAmount: string; // "100384000000000000",
    loanERC20Denomination: string; // "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
    loanDuration: number; // 1209600,
    loanInterestRateForDurationInBasisPoints: number; // 0,
    loanAdminFeeInBasisPoints: number; // 500,
    nftCollateralWrapper: string; // "0x9eDe10D090CDfbA694A03b35829a76Fd60d3d0d9",
    loanStartTime: string; // 1697215787;
    borrower: string; // "0x97B0E8F8D766Eb6e70B84287f52e6e8F260CE9E5"
  };
}

export interface LoanV2RepaidPayload extends LoanPayload, AssetPayload {
  loanPrincipalAmount: string; // "100000000000000000",
  loanERC20Denomination: string; // "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
  amountPaidToLender: string; // '100364800000000000',
  adminFee: string; // '19200000000000',
  revenueShare: string; // '0',
  revenueSharePartner: string; // "0x0000000000000000000000000000000000000000",
}

export interface LoanV2LiquidatedPayload extends LoanPayload, AssetPayload {
  loanPrincipalAmount: string; // "100000000000000000",
  loanMaturityDate: string; // '100364800000000000',
  loanLiquidationDate: string; // '19200000000000',
}

export interface LoanV2RenegotiatedPayload extends LoanPayload {
  newLoanDuration: number; // 1209600,
  newMaximumRepaymentAmount: string; // '200921000000000000',
  renegotiationFee: string; //  '0',
  renegotiationAdminFee: string; // '0'
}

export interface LoanV3StartedEventPayload extends LoanPayload {
  loanTerms: AssetPayload &
    LoanV2StartedEventPayload['loanTerms'] & {
      borrower: string; // "0x97B0E8F8D766Eb6e70B84287f52e6e8F260CE9E5",
      lender: string; // "0xca93f92f8B56CD3B08E4f353a729C905e05626c0",
      escrow: string; // "0x9eDe10D090CDfbA694A03b35829a76Fd60d3d0d9",
      originationFee: string; // '0',
      isProRata: boolean; // false,
    };
}

export type LoanV3RepaidEventPayload = Omit<LoanV2RepaidPayload, 'revenueShare' | 'revenueSharePartner'>;
export type LoanV3LiquidatedEventPayload = LoanV2LiquidatedPayload;
export interface LoanV3RenegotiatedEventPayload extends LoanV2RenegotiatedPayload {
  isProRata: boolean; // false,
}
