import { Nft } from 'src/entities/domain/Nft'
import { Days } from 'src/entities/base/Days'
import { Address } from 'src/entities/base/Address'
import { NftfiCurrency } from './NftfiCurrency'

export type Listing = {
  nft: Nft
  borrower: Address
  desiredTerms: DesiredTerms
  listedDate: Date
}

export type DesiredTerms = {
  duration: Days
  currency: NftfiCurrency | null
  isProRated: boolean | null
  preference: LoanTermsPreference
}

export enum LoanTermsPreference {
  HighAmount = 'highAmount',
  LowApr = 'lowApr',
}
