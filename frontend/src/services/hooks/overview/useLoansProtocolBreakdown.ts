import { Seconds } from 'src/entities/base/Seconds'
import { serializeAnalyticsParams } from 'src/services/fetchers/overview/utils'
import { DataKeys } from '../../keys/keys'
import { getLoansProtocolBreakdown, GetLoansProtocolBreakdownParams } from '../../fetchers/overview/getLoansProtocolBreakdown'
import { useFetcher } from '../base/useFetcher'

export function useLoansProtocolBreakdown(params: GetLoansProtocolBreakdownParams) {
  const qs = serializeAnalyticsParams({ filters: params.filters })
  return useFetcher(DataKeys.loansProtocolBreakdown(qs), () => getLoansProtocolBreakdown(params), {
    pollInterval: 60 as Seconds,
  })
}
