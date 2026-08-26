import { Address } from 'src/entities/base/Address'
import { createOnChainMutator, OnChainMutatorDependencies } from '../../factories/onChain/createOnChainMutator'

const abi = [
  'function setApprovalForAll(address to, bool approved) public returns()',
]

export type SetErc721ApprovalParams = {
  contractAddress: Address
  operator: Address
  approved: boolean
}

const setErc721ApprovalMutator = createOnChainMutator({
  abi,
  method: 'setApprovalForAll',
})

export function setErc721Approval(params: SetErc721ApprovalParams, dependencies: OnChainMutatorDependencies) {
  return setErc721ApprovalMutator({
    contractAddress: params.contractAddress,
    args: [params.operator, params.approved],
  }, dependencies)
}
