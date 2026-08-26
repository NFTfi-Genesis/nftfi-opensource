import { Seconds } from 'src/entities/base/Seconds'
import { serializeAnalyticsParams } from 'src/services/fetchers/overview/utils'
import { DataKeys } from '../../keys/keys'
import { getDueDateLoansStats, GetDueDateLoansStatsParams } from '../../fetchers/overview/getDueDateLoansStats'
import { useFetcher } from '../base/useFetcher'

export function useDueDateLoansStats(params: GetDueDateLoansStatsParams) {
  const qs = serializeAnalyticsParams({ filters: params.filters })
  return useFetcher(DataKeys.dueDateLoansStats(qs), () => getDueDateLoansStats(params), {
    pollInterval: 60 as Seconds,
  })
}
