import { Seconds } from 'src/entities/base/Seconds'
import { serializeAnalyticsParams } from 'src/services/fetchers/overview/utils'
import { DataKeys } from '../../keys/keys'
import { getLoansCurrencyBreakdown, GetLoansCurrencyBreakdownParams } from '../../fetchers/overview/getLoansCurrencyBreakdown'
import { useFetcher } from '../base/useFetcher'

export function useLoansCurrencyBreakdown(params: GetLoansCurrencyBreakdownParams) {
  const qs = serializeAnalyticsParams({ filters: params.filters })
  return useFetcher(DataKeys.loansCurrencyBreakdown(qs), () => getLoansCurrencyBreakdown(params), {
    pollInterval: 60 as Seconds,
  })
}
