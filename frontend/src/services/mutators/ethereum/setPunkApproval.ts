import { Address } from 'src/entities/base/Address'
import { Wei } from 'src/entities/base/Wei'
import { config } from 'src/config/config'
import { createOnChainMutator, OnChainMutatorDependencies } from '../../factories/onChain/createOnChainMutator'

const abi = ['function offerPunkForSaleToAddress(uint256 punkIndex, uint256 minSalePriceInWei, address toAddress)']

export type SetPunkApprovalParams = {
  tokenId: bigint
  operator: Address
  minSalePriceInWei: Wei
}

const setPunkApprovalMutator = createOnChainMutator({
  abi,
  method: 'offerPunkForSaleToAddress',
})

const cryptopunksAddress = config.ethereum.contracts.nftfi.collection.cryptopunks.address

export function setPunkApproval(
  params: SetPunkApprovalParams,
  dependencies: OnChainMutatorDependencies
) {
  return setPunkApprovalMutator(
    {
      contractAddress: cryptopunksAddress,
      args: [params.tokenId.toString(), params.minSalePriceInWei, params.operator],
    },
    dependencies
  )
}
