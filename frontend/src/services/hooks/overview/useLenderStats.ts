import { Seconds } from 'src/entities/base/Seconds'
import { serializeAnalyticsParams } from 'src/services/fetchers/overview/utils'
import { getLenderStats, GetLenderStatsParams } from '../../fetchers/overview/getLenderStats'
import { DataKeys } from '../../keys/keys'
import { useFetcher } from '../base/useFetcher'

export function useLenderStats(params: GetLenderStatsParams) {
  const qs = serializeAnalyticsParams({
    filters: params.filters,
    pagination: params.pagination,
    sort: params.sort,
  })

  return useFetcher(DataKeys.lenderStats(qs), () => getLenderStats(params), {
    pollInterval: 60 as Seconds,
  })
}
