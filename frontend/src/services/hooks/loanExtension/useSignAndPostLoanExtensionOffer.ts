import { useCallback } from 'react'
import { useAuth } from 'src/modules/auth/useAuth'
import { useWallet } from 'src/modules/wallet/useWallet'
import {
  signAndPostLoanExtensionOffer,
  SignAndPostLoanExtensionOfferParams,
} from 'src/services/mutators/loanExtension/signAndPostLoanExtensionOffer'
import { DataKeyMatchers, DataKeys } from '../../keys/keys'
import { useMutator } from '../base/useMutator'

export function useSignAndPostLoanExtensionOffer() {
  const { getSigner, getProvider } = useWallet()
  const { ensureAuthToken, unauthorize } = useAuth()

  const getKey = useCallback(
    (params: SignAndPostLoanExtensionOfferParams) =>
      DataKeys.loanExtensionOfferForLoan(params.loan.loanContract ?? null, params.loan.loanId),
    [],
  )
  const invalidateKeys = useCallback(() => DataKeyMatchers.loanExtensionOffersAll(), [])

  return useMutator({
    getKey,
    mutator: (params: SignAndPostLoanExtensionOfferParams) =>
      signAndPostLoanExtensionOffer(params, {
        ensureAuthToken,
        unauthorize,
        getSigner,
        getProvider,
      }),
    invalidateKeys,
  })
}
