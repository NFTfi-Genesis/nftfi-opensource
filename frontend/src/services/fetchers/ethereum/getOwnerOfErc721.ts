import { Address } from 'src/entities/base/Address'
import { Nft } from 'src/entities/domain/Nft'
import { createOnChainFetcher, OnChainFetcherDependencies } from '../../factories/onChain/createOnChainFetcher'

const abi = ['function ownerOf(uint256 tokenId) public view returns (address)']

const getOwnerOfErc721Fetcher = createOnChainFetcher<Address>({
  abi,
  method: 'ownerOf',
})

export async function getOwnerOfErc721(nft: Nft, dependencies: OnChainFetcherDependencies): Promise<Address> {
  const owner = await getOwnerOfErc721Fetcher({
    contractAddress: nft.address,
    args: [nft.id.toString()],
  }, dependencies)
  return owner.toLowerCase() as Address
}
