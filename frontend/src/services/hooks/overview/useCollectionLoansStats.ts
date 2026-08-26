import { Seconds } from 'src/entities/base/Seconds'
import { serializeAnalyticsParams } from 'src/services/fetchers/overview/utils'
import { DataKeys } from '../../keys/keys'
import { getCollectionLoansStats, GetCollectionLoansStatsParams } from '../../fetchers/overview/getCollectionLoansStats'
import { useFetcher } from '../base/useFetcher'

export function useCollectionLoansStats(
  params: GetCollectionLoansStatsParams,
  options?: { shouldExecute?: boolean }
) {
  const qs = serializeAnalyticsParams({ filters: params.filters })
  return useFetcher(DataKeys.collectionLoansStats(qs), () => getCollectionLoansStats(params), {
    pollInterval: 60 as Seconds,
    shouldExecute: options?.shouldExecute,
  })
}
