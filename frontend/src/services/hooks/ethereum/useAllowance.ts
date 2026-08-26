import { Address } from 'src/entities/base/Address'
import { useWallet } from 'src/modules/wallet/useWallet'
import { Currency } from 'src/entities/domain/Currency'
import { getAllowance } from '../../fetchers/ethereum/getAllowance'
import { DataKeys } from '../../keys/keys'
import { useFetcher } from '../base/useFetcher'

export function useAllowance(currency: Currency, address: Address | null, spender: Address) {
  const { getProvider } = useWallet()
  const result = useFetcher(
    DataKeys.allowance(currency, address, spender),
    () => getAllowance(currency, address!, spender, { getProvider }),
  )
  return result
}
