import { Address } from 'src/entities/base/Address'
import { Wei } from 'src/entities/base/Wei'
import { Currency } from 'src/entities/domain/Currency'
import { getCurrencyAddress } from 'src/utils/currencies'
import { createOnChainFetcher, OnChainFetcherDependencies } from '../../factories/onChain/createOnChainFetcher'

const abi = [
  'function balanceOf(address owner) view returns (uint256)',
]

const balanceFetcher = createOnChainFetcher<Wei>({
  abi,
  method: 'balanceOf',
})

export async function getBalance(currency: Currency, address: Address, dependencies: OnChainFetcherDependencies): Promise<Wei> {
  const balance = await balanceFetcher({
    contractAddress: getCurrencyAddress(currency),
    args: [address],
  }, dependencies)
  return balance
}
