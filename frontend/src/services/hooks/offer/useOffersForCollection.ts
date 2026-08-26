import { useAuth } from 'src/modules/auth/useAuth'
import { useWallet } from 'src/modules/wallet/useWallet'
import { Collection } from 'src/entities/domain/Collection'
import { DataKeys } from '../../keys/keys'
import { getOffersForCollectionValidated } from '../../fetchers/offer/getOfferForCollectionValidated'
import { useFetcher } from '../base/useFetcher'

export function useOffersForCollection(collection: Collection) {
  const { ensureAuthToken, unauthorize } = useAuth()
  const { getProvider } = useWallet()

  return useFetcher(
    DataKeys.offersForCollection(collection),
    () => getOffersForCollectionValidated(collection, { ensureAuthToken, unauthorize, getProvider })
  )
}
