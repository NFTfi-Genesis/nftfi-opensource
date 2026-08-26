import { useCallback } from 'react'
import { useWallet } from 'src/modules/wallet/useWallet'
import { Address } from 'src/entities/base/Address'
import { Wei } from 'src/entities/base/Wei'
import { config } from 'src/config/config'
import { DataKeys } from '../../keys/keys'
import { setNftApproval, SetNftApprovalParams } from '../../mutators/ethereum/setNftApproval'
import { SetPunkApprovalParams } from '../../mutators/ethereum/setPunkApproval'
import { SetErc721ApprovalParams } from '../../mutators/ethereum/setErc721Approval'
import { useMutator } from '../base/useMutator'

const cryptopunksAddress = config.ethereum.contracts.nftfi.collection.cryptopunks.address.toLowerCase()

export function useSetNftApproval() {
  const { getSigner, walletAddress } = useWallet()

  const getKey = useCallback(
    (
      contractAddress: Address,
      operator: Address,
      tokenId: bigint | undefined,
      _approval: boolean,
      _minSalePriceInWei: Wei | undefined
    ) => DataKeys.nftApproval(contractAddress, walletAddress, operator, tokenId),
    [walletAddress]
  )

  return useMutator({
    getKey,
    mutator: async (
      contractAddress: SetErc721ApprovalParams['contractAddress'],
      operator: SetPunkApprovalParams['operator'],
      tokenId: SetPunkApprovalParams['tokenId'] | undefined,
      approved: SetErc721ApprovalParams['approved'],
      minSalePriceInWei: SetPunkApprovalParams['minSalePriceInWei'] | undefined
    ) => {
      const contractAddressLower = contractAddress.toLowerCase()
      const params: SetNftApprovalParams
        = contractAddressLower === cryptopunksAddress
          ? ({ contractAddress, operator, tokenId: tokenId!, minSalePriceInWei: minSalePriceInWei! } as SetPunkApprovalParams & { contractAddress: Address })
          : { contractAddress, operator, approved }
      return await setNftApproval(params, { getSigner })
    },
  })
}
