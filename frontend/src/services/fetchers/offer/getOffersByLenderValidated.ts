import { Address } from 'src/entities/base/Address'
import { Loan } from 'src/entities/domain/Loan'
import { AssetOfferExtended, CollectionOfferExtended, ContractOfferExtended } from 'src/entities/app/OfferExtended'
import { OfferValidated } from 'src/entities/app/OfferValidated'
import { OfferStatus, OfferType } from 'src/entities/domain/Offer'
import { Protocol } from 'src/entities/domain/Protocol'
import { NftfiApiFetcherDependencies } from '../../factories/nftfiApi/createNftfiApiFetcher'
import { AuthMode } from '../../types/AuthMode'
import { OnChainFetcherDependencies } from '../../factories/onChain/createOnChainFetcher'
import { getAllLoansByLender } from '../loan/getAllLoansByLender'
import { validateOffer } from './validateOffer'
import { getOffersByLender } from './getOffersByLender'

export type GetOffersByLenderValidatedDependencies = NftfiApiFetcherDependencies<AuthMode.Optional> & OnChainFetcherDependencies

export async function getOffersByLenderValidated(lender: Address, deps: GetOffersByLenderValidatedDependencies): Promise<Array<
  | AssetOfferExtended<OfferValidated>
  | CollectionOfferExtended<OfferValidated>
  | ContractOfferExtended<OfferValidated>
>> {
  const offers = await getOffersByLender(lender, deps)
  let loans: Array<Loan> = []
  if (offers.length !== 0) {
    loans = await getAllLoansByLender(lender, [Protocol.Nftfi, Protocol.Blur])
  }

  const validatedOffers = await Promise.all(
    offers.map(async offer => {
      const loan = loans.find(loan => offer.type === OfferType.Asset && loan.nft.id === offer.nft.id && loan.nft.address === offer.nft.address && loan.lender === lender)
      return await validateOffer({ offer, loan }, deps)
    })
  )
  // Filter out offers that have invalid nonce, i.e. revoked on-chain
  return validatedOffers.filter(offer => {
    if (offer.status === OfferStatus.Invalid) {
      return !offer.invalidReason.invalidNonce
    }
    return true
  })
}
