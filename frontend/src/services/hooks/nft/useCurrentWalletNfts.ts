import { getWalletNfts } from 'src/services/fetchers/nft/getWalletNfts'
import { DataKeys } from 'src/services/keys/keys'
import { useWallet } from 'src/modules/wallet/useWallet'
import { useFetcher } from '../base/useFetcher'

export function useCurrentWalletNfts() {
  const { walletAddress } = useWallet()
  return useFetcher(
    DataKeys.walletNfts(walletAddress),
    () => getWalletNfts(walletAddress!)
  )
}
