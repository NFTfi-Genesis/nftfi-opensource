import { Seconds } from 'src/entities/base/Seconds'
import { getFxRate } from '../../fetchers/ethereum/getFxRate'
import { DataKeys } from '../../keys/keys'
import { useFetcher } from '../base/useFetcher'

export function useFxRate() {
  const result = useFetcher(
    DataKeys.fxRate(),
    () => getFxRate(),
    {
      pollInterval: 10 * 60 as Seconds, // 10 minutes
    }
  )
  return result
}
