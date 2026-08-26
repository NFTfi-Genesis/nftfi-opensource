import { useWallet } from 'src/modules/wallet/useWallet'
import { useAuth } from 'src/modules/auth/useAuth'
import { ContactsSortType, ContactsSortDirection, sortContacts } from 'src/utils/contacts'
import { getContacts } from '../../fetchers/account/getContacts'
import { DataKeys } from '../../keys/keys'
import { useFetcher } from '../base/useFetcher'

export function useContacts(sortType?: ContactsSortType, sortDirection?: ContactsSortDirection) {
  const { walletAddress, getProvider } = useWallet()
  const { ensureAuthToken, unauthorize, isAuthenticated } = useAuth()

  const { data, ...rest } = useFetcher(
    DataKeys.contacts(walletAddress),
    () => getContacts(walletAddress!, { getProvider, ensureAuthToken, unauthorize }),
    { shouldExecute: isAuthenticated }
  )

  return {
    data: data
      ? sortContacts(data, sortType, sortDirection)
      : [],
    ...rest,
  }
}
