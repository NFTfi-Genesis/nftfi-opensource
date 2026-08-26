import { useWallet } from 'src/modules/wallet/useWallet'
import { getSanctioned } from '../../fetchers/account/getSanctioned'
import { DataKeys } from '../../keys/keys'
import { useFetcher } from '../base/useFetcher'

export function useSanctioned() {
  const { walletAddress } = useWallet()
  return useFetcher(
    DataKeys.sanctioned(walletAddress),
    () => getSanctioned(walletAddress!),
    { shouldExecute: Boolean(walletAddress) }
  )
}
