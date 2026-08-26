import { Offer } from 'src/entities/domain/Offer'
import { Loan } from 'src/entities/domain/Loan'
import { Protocol } from 'src/entities/domain/Protocol'
import { PanicError } from 'src/errors/PanicError'
import { isAssetOffer, isCollectionOffer, isContractOffer } from 'src/utils/offers'
import { OnChainMutatorDependencies } from '../../factories/onChain/createOnChainMutator'
import { OnChainFetcherDependencies } from '../../factories/onChain/createOnChainFetcher'
import { GondiRefinanceData } from '../../types/GondiRefinanceData'
import { refinanceLoanNftfi } from './refinanceLoanNftfi'
import { refinanceLoanGondi } from './refinanceLoanGondi'
import { refinanceCollectionLoanNftfi } from './refinanceCollectionLoanNftfi'
import { refinanceContractLoanNftfi } from './refinanceContractLoanNftfi'
import { refinanceCollectionLoanGondi } from './refinanceCollectionLoanGondi'
import { refinanceContractLoanGondi } from './refinanceContractLoanGondi'

type RefinanceLoanDependencies = OnChainFetcherDependencies & OnChainMutatorDependencies

export type RefinanceLoanParams = {
  loan: Loan
  offer: Offer
} & ({ protocol: Protocol.Gondi, refiData: GondiRefinanceData } | { protocol: Protocol.Nftfi })

export async function refinanceLoan(params: RefinanceLoanParams, dependencies: RefinanceLoanDependencies) {
  const { loan, offer, protocol } = params

  if (protocol === Protocol.Gondi) {
    const { refiData } = params
    if (!refiData.loanContractAddress || !refiData.encodedRepaymentData) {
      throw new PanicError({
        message: 'Gondi refinance requires loanContractAddress and encodedRepaymentData',
        details: { refiData },
      })
    }
    if (isCollectionOffer(offer) && !offer.isContractOfferOriginally) {
      return await refinanceCollectionLoanGondi(loan, offer, refiData, dependencies)
    }

    if (isContractOffer(offer)) {
      return await refinanceContractLoanGondi(loan, offer, refiData, dependencies)
    }

    if (isAssetOffer(offer)) {
      return await refinanceLoanGondi(loan, offer, refiData, dependencies)
    }

  }

  if (protocol === Protocol.Nftfi) {
    if (isCollectionOffer(offer) && !offer.isContractOfferOriginally) {
      return await refinanceCollectionLoanNftfi(loan, offer, dependencies)
    }
    if (isContractOffer(offer)) {
      return await refinanceContractLoanNftfi(loan, offer, dependencies)
    }

    if (isAssetOffer(offer)) {
      return await refinanceLoanNftfi(loan, offer, dependencies)
    }
  }
}
