import { Address } from 'src/entities/base/Address'
import { OfferType } from 'src/entities/domain/Offer'
import { config } from 'src/config/config'
import { getOfferTypeBytes } from 'src/utils/offers'
import { createOnChainFetcher, OnChainFetcherDependencies } from '../../factories/onChain/createOnChainFetcher'

const coordinatorAddress = config.ethereum.contracts.nftfi.v3.coordinator.address

const abi = [
  'function getDefaultLoanContractForOfferType(bytes32 _offerType) view returns (address)',
]

const getDefaultLoanContractFetcher = createOnChainFetcher<Address>({
  abi,
  method: 'getDefaultLoanContractForOfferType',
})

export async function getNftfiLatestLoanContract(offerType: OfferType, dependencies: OnChainFetcherDependencies): Promise<Address> {
  const offerTypeBytes32 = getOfferTypeBytes(offerType)

  const contractAddress = await getDefaultLoanContractFetcher({
    contractAddress: coordinatorAddress,
    args: [offerTypeBytes32],
  }, dependencies)
  return contractAddress
}
