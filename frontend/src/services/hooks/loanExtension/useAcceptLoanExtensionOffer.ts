import { useCallback } from 'react'
import { useWallet } from 'src/modules/wallet/useWallet'
import {
  acceptLoanExtensionOffer,
  AcceptLoanExtensionOfferParams,
} from 'src/services/mutators/loanExtension/acceptLoanExtensionOffer'
import { DataKeyMatchers, DataKeys } from '../../keys/keys'
import { useMutator } from '../base/useMutator'

export function useAcceptLoanExtensionOffer() {
  const { getSigner, getProvider } = useWallet()

  const getKey = useCallback(
    (params: AcceptLoanExtensionOfferParams) =>
      DataKeys.loanExtensionOfferForLoan(params.offer.loanContract, params.offer.loanId),
    [],
  )
  const invalidateKeys = useCallback(() => DataKeyMatchers.loansAll(), [])

  return useMutator({
    getKey,
    mutator: (params: AcceptLoanExtensionOfferParams) =>
      acceptLoanExtensionOffer(params, { getSigner, getProvider }),
    invalidateKeys,
  })
}
