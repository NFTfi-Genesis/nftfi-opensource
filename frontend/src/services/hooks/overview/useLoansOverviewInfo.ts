import { Seconds } from 'src/entities/base/Seconds'
import { serializeAnalyticsParams } from 'src/services/fetchers/overview/utils'
import { getLoansOverviewInfo, GetLoansOverviewInfoParams } from '../../fetchers/overview/getLoansOverviewInfo'
import { DataKeys } from '../../keys/keys'
import { useFetcher } from '../base/useFetcher'

export function useLoansOverviewInfo(params: GetLoansOverviewInfoParams) {
  const qs = serializeAnalyticsParams({ filters: params.filters })
  return useFetcher(DataKeys.loansOverviewInfo(qs), () => getLoansOverviewInfo(params), {
    pollInterval: 60 as Seconds,
  })
}
