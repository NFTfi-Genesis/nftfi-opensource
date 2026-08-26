import { Address } from 'src/entities/base/Address'
import { useWallet } from 'src/modules/wallet/useWallet'
import { isORMinted } from '../../fetchers/ethereum/isORMinted'
import { DataKeys } from '../../keys/keys'
import { useFetcher } from '../base/useFetcher'

export function useIsORMinted(loanId: number, walletAddress: Address | null) {
  const { getProvider } = useWallet()

  const result = useFetcher(
    DataKeys.isORMinted(loanId, walletAddress),
    () => isORMinted(loanId, walletAddress, { getProvider }),
  )
  return result
}
