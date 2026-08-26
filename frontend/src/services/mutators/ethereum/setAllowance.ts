import { Address } from 'src/entities/base/Address'
import { Currency } from 'src/entities/domain/Currency'
import { Wei } from 'src/entities/base/Wei'
import { getCurrencyAddress } from 'src/utils/currencies'
import { createOnChainMutator, OnChainMutatorDependencies } from '../../factories/onChain/createOnChainMutator'

const abi = [
  'function approve(address spender, uint256 amount) returns (bool)',
]

const setAllowanceMutator = createOnChainMutator({
  abi,
  method: 'approve',
})

export function setAllowance(currency: Currency, spender: Address, amount: Wei, dependencies: OnChainMutatorDependencies) {
  return setAllowanceMutator({
    contractAddress: getCurrencyAddress(currency),
    args: [spender, amount],
  }, dependencies)
}
