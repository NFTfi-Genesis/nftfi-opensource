import { Seconds } from 'src/entities/base/Seconds'
import { getGasPrice } from '../../fetchers/ethereum/getGasPrice'
import { DataKeys } from '../../keys/keys'
import { useFetcher } from '../base/useFetcher'

const GAS_PRICE_REFRESH_INTERVAL = 10 * 60 * 1000 as Seconds // 10 minutes

export function useGasPrice() {
  const result = useFetcher(
    DataKeys.gasPrice(),
    () => getGasPrice(),
    {
      pollInterval: GAS_PRICE_REFRESH_INTERVAL,
    }
  )
  return result
}
