import { useWallet } from 'src/modules/wallet/useWallet'
import { useAuth } from 'src/modules/auth/useAuth'
import { getAccount } from '../../fetchers/account/getAccount'
import { DataKeys } from '../../keys/keys'
import { useFetcher } from '../base/useFetcher'

export function useAccount() {
  const { walletAddress } = useWallet()
  const { ensureAuthToken, unauthorize } = useAuth()
  const result = useFetcher(
    DataKeys.account(walletAddress),
    () => getAccount(walletAddress!, { ensureAuthToken, unauthorize })
  )
  return result
}
