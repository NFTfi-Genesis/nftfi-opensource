import { Address } from 'src/entities/base/Address'
import { getWalletNfts } from 'src/services/fetchers/nft/getWalletNfts'
import { DataKeys } from 'src/services/keys/keys'
import { useFetcher } from '../base/useFetcher'

export function useWalletNfts(walletAddress: Address) {
  return useFetcher(
    DataKeys.walletNfts(walletAddress),
    () => getWalletNfts(walletAddress)
  )
}
