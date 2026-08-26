import { Address } from 'src/entities/base/Address'
import { config } from 'src/config/config'
import { createOnChainFetcher, OnChainFetcherDependencies } from '../../factories/onChain/createOnChainFetcher'

const abi = ['function getLoanDataAndOfferType(uint32 _loanId) view returns (tuple(address, uint64, uint8), bytes32)']

const getLoanDataAndOfferTypeFetcher = createOnChainFetcher<[[Address, bigint, number], string]>({
  abi,
  method: 'getLoanDataAndOfferType',
})

const coordinatorAddress = config.ethereum.contracts.nftfi.v3.coordinator.address

export async function getNftfiLoanContractAndORId(
  loanId: number,
  dependencies: OnChainFetcherDependencies
): Promise<{ loanContractAddress: Address, ORId: bigint }> {
  const loanData = await getLoanDataAndOfferTypeFetcher(
    {
      contractAddress: coordinatorAddress,
      args: [loanId],
    },
    dependencies
  )

  const loanContractAddress = loanData[0][0]
  const ORId = loanData[0][1]
  return { loanContractAddress, ORId }
}
