import { useCallback } from 'react'
import { LoanExtensionOffer } from 'src/entities/domain/LoanExtensionOffer'
import { useAuth } from 'src/modules/auth/useAuth'
import { revokeLoanExtensionOffer } from 'src/services/mutators/loanExtension/revokeLoanExtensionOffer'
import { DataKeyMatchers, DataKeys } from '../../keys/keys'
import { useMutator } from '../base/useMutator'

export function useRevokeLoanExtensionOffer() {
  const { ensureAuthToken, unauthorize } = useAuth()

  const getKey = useCallback(
    (offer: LoanExtensionOffer) => DataKeys.loanExtensionOfferForLoan(offer.loanContract, offer.loanId),
    [],
  )
  const invalidateKeys = useCallback(() => DataKeyMatchers.loanExtensionOffersAll(), [])

  return useMutator({
    getKey,
    mutator: (offer: LoanExtensionOffer) =>
      revokeLoanExtensionOffer({ offerId: offer.id }, { ensureAuthToken, unauthorize }),
    invalidateKeys,
  })
}
