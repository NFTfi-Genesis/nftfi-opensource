import { Address } from 'src/entities/base/Address'
import { config } from 'src/config/config'
import { createOnChainFetcher, OnChainFetcherDependencies } from '../../factories/onChain/createOnChainFetcher'

const abi = [
  'function punksOfferedForSale(uint256) view returns (bool isForSale, uint256 punkIndex, address seller, uint256 minValue, address onlySellTo)',
]

type PunkOfferedForSaleResult = [boolean, bigint, Address, bigint, Address]

const punkOfferedForSaleFetcher = createOnChainFetcher<PunkOfferedForSaleResult>({
  abi,
  method: 'punksOfferedForSale',
})

const cryptopunksAddress = config.ethereum.contracts.nftfi.collection.cryptopunks.address

export async function getPunkApproval(tokenId: bigint, operator: Address, dependencies: OnChainFetcherDependencies): Promise<boolean> {
  const buyer = operator.toLowerCase()

  const result = await punkOfferedForSaleFetcher({
    contractAddress: cryptopunksAddress,
    args: [tokenId.toString()],
  }, dependencies)

  const [isForSale, , , , onlySellTo] = result
  const approved = isForSale === true && onlySellTo.toLowerCase() === buyer

  return approved
}
