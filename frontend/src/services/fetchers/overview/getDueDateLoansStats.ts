import { Amount } from 'src/entities/base/Amount'
import { Percentage } from 'src/entities/base/Percentage'
import { Entities } from 'src/entities/utils/Entities'
import { MarketFilters } from 'src/features/market/tables/useMarketFilters'
import { DueDateLoansStats } from 'src/entities/app/DueDateLoansStats'
import { ChartMode, getChartMode } from 'src/features/market/Overview/utils'
import { createNftfiApiFetcher } from '../../factories/nftfiApi/createNftfiApiFetcher'
import { AuthMode } from '../../types/AuthMode'
import { serializeAnalyticsParams } from './utils'

export type GetDueDateLoansStatsParams = {
  filters: MarketFilters
}

export type ApiResponseDueDateLoansStats = {
  avgApr: number | null
  avgUsdValue: number | null
  dueDay: string | null
  loanCount: number | null
  totalUsdValue: number | null
}

const dueDateLoansStatsFetcher = createNftfiApiFetcher<ApiResponseDueDateLoansStats[]>({
  authMode: AuthMode.None,
})

export async function getDueDateLoansStats(params: GetDueDateLoansStatsParams) {
  const filters = { ...params.filters }
  if (!filters.dueWithin) {
    filters.dueWithin = 365
  }
  // Day-grouping happens server-side. Pass the user's IANA timezone so each `dueDay` represents
  // the user-local calendar day; the FE then parses/formats dates in that same local frame and
  // bucket keys line up without any UTC reconciliation.
  const search = new URLSearchParams(serializeAnalyticsParams({ filters }))
  search.set('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone)
  const response = await dueDateLoansStatsFetcher(
    { url: `v1/analytics/stats-by-day?${search.toString()}` },
    null as never,
  )
  const loansStats = convertDueDateLoansStats(response)
  return groupDueDateLoansStats(loansStats, filters)
}

function convertDueDateLoansStats(data: ApiResponseDueDateLoansStats[]): Entities<DueDateLoansStats> {
  const convertedData = data.map(item => ({
    // BE may return `dueDay` as either a bare "YYYY-MM-DD" string or a full ISO timestamp
    // ("2026-04-29T00:00:00.000Z") depending on how the pg driver serializes PostgreSQL DATE
    // values. Normalize to the date-only form so it compares equal to the skeleton's local-day
    // strings; without this every day shows up twice in the chart (one from data, one from pad).
    date: (item.dueDay || '').slice(0, 10),
    loanCount: item.loanCount || 0,
    totalUsdValue: item.totalUsdValue as Amount || 0 as Amount,
    avgUsdValue: item.avgUsdValue as Amount || 0 as Amount,
    avgApr: item.avgApr as Percentage || 0 as Percentage,
  })).filter(i => Boolean(i.date))
  return convertedData
}

// BE returns `dueDay` as a YYYY-MM-DD string already grouped in the user's timezone. Parse it
// as local midnight (component constructor) so getDate/getDay/setDate all stay in the same local
// frame as the skeleton's `new Date()` — avoids the UTC-vs-local mismatch that breaks Sunday math.
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getBucketKey(date: Date, chartMode: ChartMode): string {
  if (chartMode === ChartMode.Week) {
    const sunday = new Date(date)
    sunday.setDate(date.getDate() - date.getDay())
    return formatLocalDate(sunday)
  }
  if (chartMode === ChartMode.Month) {
    return formatLocalDate(date).slice(0, 7)
  }
  return formatLocalDate(date)
}

// The new analytics endpoint only returns rows for dates with at least one loan, so empty
// months/weeks/days disappear from the chart axis. Pad the grouped result with zero entries
// across the full window so the X axis stays continuous (matches legacy TB behaviour).
function padBucketsWithZeros(
  data: Entities<DueDateLoansStats>,
  filters: MarketFilters,
  chartMode: ChartMode,
): Entities<DueDateLoansStats> {
  if (chartMode === ChartMode.OneDay) return data

  const days = filters.dueWithin ?? 365
  const today = new Date()
  const expectedKeys = new Set<string>()
  for (let i = 0; i <= days; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    expectedKeys.add(getBucketKey(d, chartMode))
  }

  const byKey = new Map(data.map(item => [item.date, item]))
  data.forEach(item => expectedKeys.add(item.date))

  return Array.from(expectedKeys)
    .sort()
    .map(key => byKey.get(key) ?? {
      date: key,
      loanCount: 0,
      totalUsdValue: 0 as Amount,
      avgUsdValue: 0 as Amount,
      avgApr: 0 as Percentage,
    })
}

function groupDueDateLoansStats(data: Entities<DueDateLoansStats>, filters: MarketFilters) {
  const chartMode = getChartMode(filters)
  // Groups items that are due in the same week
  if (chartMode === ChartMode.Week) {
    const weekMap = data.reduce((acc: Record<string, DueDateLoansStats>, item) => {
      const date = parseLocalDate(item.date)
      // Get the start of the week (Sunday)
      const startOfWeek = new Date(date)
      startOfWeek.setDate(date.getDate() - date.getDay())

      const weekKey = formatLocalDate(startOfWeek)

      if (!acc[weekKey]) {
        acc[weekKey] = {
          date: weekKey,
          loanCount: 0,
          totalUsdValue: 0 as Amount,
          avgUsdValue: 0 as Amount,
          avgApr: 0 as Percentage,
        }
      }

      acc[weekKey].loanCount = acc[weekKey].loanCount + item.loanCount
      acc[weekKey].totalUsdValue = (acc[weekKey].totalUsdValue + item.totalUsdValue) as Amount

      // Recalculate averages
      if (acc[weekKey].loanCount > 0) {
        acc[weekKey].avgUsdValue = (acc[weekKey].totalUsdValue / acc[weekKey].loanCount) as Amount

        // Weighted average APR calculation
        const prevTotalLoans = acc[weekKey].loanCount - item.loanCount
        if (prevTotalLoans > 0) {
          const prevWeightedApr = acc[weekKey].avgApr * prevTotalLoans
          const newWeightedApr = item.avgApr * item.loanCount
          acc[weekKey].avgApr = ((prevWeightedApr + newWeightedApr) / acc[weekKey].loanCount) as Percentage
        } else {
          acc[weekKey].avgApr = item.avgApr
        }
      }

      return acc
    }, {})

    return padBucketsWithZeros(Object.values(weekMap), filters, chartMode)
  }
  // Groups items that are due in the same month
  if (chartMode === ChartMode.Month) {
    const monthMap = data.reduce((acc: Record<string, DueDateLoansStats>, item) => {
      const month = item.date.slice(0, 7)
      if (!acc[month]) {
        acc[month] = {
          date: month,
          loanCount: 0,
          totalUsdValue: 0 as Amount,
          avgUsdValue: 0 as Amount,
          avgApr: 0 as Percentage,
        }
      }
      acc[month].loanCount = acc[month].loanCount + item.loanCount
      acc[month].totalUsdValue = (acc[month].totalUsdValue + item.totalUsdValue) as Amount
      acc[month].avgUsdValue = (acc[month].totalUsdValue / acc[month].loanCount) as Amount
      acc[month].avgApr = ((acc[month].avgApr * (acc[month].loanCount - item.loanCount)
          + item.avgApr * item.loanCount)
          / acc[month].loanCount) as Percentage
      return acc
    }, {})
    return padBucketsWithZeros(Object.values(monthMap), filters, chartMode)
  }
  return padBucketsWithZeros(data, filters, chartMode)
}
