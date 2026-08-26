import { useAuth } from 'src/modules/auth/useAuth'
import { useWallet } from 'src/modules/wallet/useWallet'
import { Address } from 'src/entities/base/Address'
import { DataKeys } from '../../keys/keys'
import { getOffersByLenderValidated } from '../../fetchers/offer/getOffersByLenderValidated'
import { useFetcher } from '../base/useFetcher'

export function useOffersByLender(lender: Address | null) {
  const { ensureAuthToken, unauthorize } = useAuth()
  const { getProvider } = useWallet()

  return useFetcher(
    DataKeys.offersByLender(lender),
    () => getOffersByLenderValidated(lender!, { ensureAuthToken, unauthorize, getProvider })
  )
}
