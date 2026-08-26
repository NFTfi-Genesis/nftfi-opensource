import { Address } from 'src/entities/base/Address'
import { Wei } from 'src/entities/base/Wei'
import { Currency } from 'src/entities/domain/Currency'
import { getCurrencyAddress } from 'src/utils/currencies'
import { createOnChainFetcher, OnChainFetcherDependencies } from '../../factories/onChain/createOnChainFetcher'

const abi = [
  'function allowance(address owner, address spender) view returns (uint256)',
]

const allowanceFetcher = createOnChainFetcher<Wei>({
  abi,
  method: 'allowance',
})

export async function getAllowance(currency: Currency, address: Address, spender: Address, dependencies: OnChainFetcherDependencies): Promise<Wei> {
  const allowance = await allowanceFetcher({
    contractAddress: getCurrencyAddress(currency),
    args: [address, spender],
  }, dependencies)
  return allowance
}
