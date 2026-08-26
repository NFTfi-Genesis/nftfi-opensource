import { Address } from 'src/entities/base/Address'
import { useWallet } from 'src/modules/wallet/useWallet'
import { getNftApproval } from '../../fetchers/ethereum/getNftApproval'
import { DataKeys } from '../../keys/keys'
import { useFetcher } from '../base/useFetcher'

export function useNftApproval(
  contractAddress: Address,
  owner: Address | null,
  operator: Address,
  tokenId?: bigint
) {
  const { getProvider } = useWallet()
  const result = useFetcher(
    DataKeys.nftApproval(contractAddress, owner, operator, tokenId),
    () => getNftApproval({ contractAddress, owner: owner!, operator, tokenId }, { getProvider }),
  )
  return result
}
