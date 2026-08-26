import { Address } from 'src/entities/base/Address'
import { createOnChainFetcher, OnChainFetcherDependencies } from '../../factories/onChain/createOnChainFetcher'

const abi = [
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
]

const approvalFetcher = createOnChainFetcher<boolean>({
  abi,
  method: 'isApprovedForAll',
})

export async function getApproval(contractAddress: Address, owner: Address, operator: Address, dependencies: OnChainFetcherDependencies): Promise<boolean> {
  const approval = await approvalFetcher({
    contractAddress,
    args: [owner, operator],
  }, dependencies)
  return approval
}
