import { Seconds } from 'src/entities/base/Seconds'
import { serializeAnalyticsParams } from 'src/services/fetchers/overview/utils'
import { getBorrowerStats, GetBorrowerStatsParams } from '../../fetchers/overview/getBorrowerStats'
import { DataKeys } from '../../keys/keys'
import { useFetcher } from '../base/useFetcher'

export function useBorrowerStats(params: GetBorrowerStatsParams) {
  const qs = serializeAnalyticsParams({
    filters: params.filters,
    pagination: params.pagination,
    sort: params.sort,
  })

  return useFetcher(DataKeys.borrowerStats(qs), () => getBorrowerStats(params), {
    pollInterval: 60 as Seconds,
  })
}
