import { Address } from 'src/entities/base/Address'
import { Seconds } from 'src/entities/base/Seconds'

export enum LoanExtensionOfferStatus {
  Active = 'active',
  Accepted = 'accepted',
  Expired = 'expired',
  Cancelled = 'cancelled',
  Replaced = 'replaced',
}

export type LoanExtensionOfferTerms = {
  duration: Seconds
  fee: bigint
}

export type LoanExtensionOffer = {
  id: number
  loanId: number
  loanContract: Address
  lender: Address
  borrower: Address
  terms: LoanExtensionOfferTerms
  lenderNonce: bigint
  expiry: Seconds
  signature: string
  status: LoanExtensionOfferStatus
  createdDate: Date
}
