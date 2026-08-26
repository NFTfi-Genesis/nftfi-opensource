import { Address } from 'src/entities/base/Address'
import { Currency } from 'src/entities/domain/Currency'
import { useWallet } from 'src/modules/wallet/useWallet'
import { getBalance } from '../../fetchers/ethereum/getBalance'
import { DataKeys } from '../../keys/keys'
import { useFetcher } from '../base/useFetcher'

export function useBalance(currency: Currency, address: Address | null) {
  const { getProvider } = useWallet()

  const result = useFetcher(
    DataKeys.balance(currency, address),
    () => getBalance(currency, address!, { getProvider })
  )
  return result
}
