import { useAuth } from 'src/modules/auth/useAuth'
import { Nft } from 'src/entities/domain/Nft'
import { useWallet } from 'src/modules/wallet/useWallet'
import { Loan } from 'src/entities/domain/Loan'
import { DataKeys } from '../../keys/keys'
import { getOffersForNftValidated } from '../../fetchers/offer/getOffersForNftValidated'
import { useFetcher } from '../base/useFetcher'

export function useOffersForNft({ nft, loan }: { nft: Nft, loan?: Loan }) {
  const { ensureAuthToken, unauthorize } = useAuth()
  const { getProvider } = useWallet()

  return useFetcher(
    DataKeys.offersForNft(nft),
    () => getOffersForNftValidated({ nft, loan } ,{ ensureAuthToken, unauthorize, getProvider })
  )
}
