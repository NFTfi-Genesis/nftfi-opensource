import { Currency } from 'src/entities/domain/Currency'
import { Address } from 'src/entities/base/Address'
import { Wei } from 'src/entities/base/Wei'
import { OnChainMutatorDependencies } from '../../factories/onChain/createOnChainMutator'
import { setAllowance } from './setAllowance'

const MAX_UINT256 = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffn

export function setAllowanceMax(currency: Currency, spender: Address, dependencies: OnChainMutatorDependencies) {
  return setAllowance(currency, spender, MAX_UINT256 as Wei, dependencies)
}
