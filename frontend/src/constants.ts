export const GONDI_LOAN_V3_1_ADDRESS = '0xf41B389E0C1950dc0B16C9498eaE77131CC08A56'
export const GONDI_LOAN_V3_1_NAME = 'gondi.loan.v3_1'
export const GONDI_LOAN_V3_ADDRESS = '0xf65B99CE6DC5F6c556172BCC0Ff27D3665a7d9A8'
export const GONDI_LOAN_V3_NAME = 'gondi.loan.v3'

// Cross-protocol refinancing (refinancing a non-NFTfi loan — e.g. a Gondi loan —
// with an NFTfi offer) is disabled. NFTfi→NFTfi refinancing is unaffected. Flip
// to true to re-enable: this gates the Gondi "Refinance" CTA in
// useActiveLoansColumns and the "Accept" column in useBorrowerOffersColumns.
export const CROSS_PROTOCOL_REFI_ENABLED = false
