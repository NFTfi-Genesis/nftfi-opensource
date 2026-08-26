import { Theme } from '@mui/material/styles'
import { format } from 'date-fns'
import { MarketFilters } from 'src/features/market/tables/useMarketFilters'
import { CurrencyTicker } from 'src/utils/currencies'
import { Currency } from 'src/entities/domain/Currency'
import { Protocol } from 'src/entities/domain/Protocol'
import { ProtocolDisplayNames } from 'src/utils/protocols'
import { Amount } from 'src/entities/base/Amount'
import { Percentage } from 'src/entities/base/Percentage'
import { LoansProtocolBreakdown } from 'src/entities/app/LoansProtocolBreakdown'
import { LoansCurrencyBreakdown } from 'src/entities/app/LoansCurrencyBreakdown'
import { LoansStatsByCollection } from 'src/entities/app/LoansStatsByCollection'
import { LoansOverviewInfo } from 'src/entities/app/LoansOverviewInfo'
import { DueDateLoansStats } from 'src/entities/app/DueDateLoansStats'
import {
  LoansProtocolBreakdownFormatted,
  LoanStatsByCollectionFormatted,
  LoanStatsByDueDate,
  LoansCurrencyBreakdownFormatted,
} from './types'
// Groups the data by the chart mode
export function groupLoanStatsByDueDate(data: LoanStatsByDueDate[], filters: MarketFilters) {
  const chartMode = getChartMode(filters)
  // Groups items that are due in the same week
  if (chartMode === ChartMode.Week) {
    const weekMap = data.reduce((acc: Record<string, LoanStatsByDueDate>, item) => {
      const date = new Date(item.date)
      // Get the start of the week (Sunday)
      const startOfWeek = new Date(date)
      startOfWeek.setDate(date.getDate() - date.getDay())

      // Format as YYYY-MM-DD
      const weekKey = startOfWeek.toISOString().slice(0, 10)

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

    return Object.values(weekMap)
  }
  // Groups items that are due in the same month
  if (chartMode === ChartMode.Month) {
    const monthMap = data.reduce((acc: Record<string, LoanStatsByDueDate>, item) => {
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
    return Object.values(monthMap)
  }
  return data
}

export enum ChartMode {
  OneDay = 'one_day',
  Day = 'day',
  Week = 'week',
  Month = 'month',
}

export function formatDateByChartModeShort(date: Date, chartMode: ChartMode) {
  if (chartMode === ChartMode.Day) return format(date, 'dd/MM')
  if (chartMode === ChartMode.Week) {
    const endDate = new Date(date)
    endDate.setDate(date.getDate() + 7)
    return `${format(date, 'dd')}-${format(endDate, 'dd')} ${format(date, 'MMM ‘yy')}`
  }
  // Default to month
  return format(date, 'MMM ‘yy')
}

export function formatDateByChartModeLong(date: Date, chartMode: ChartMode) {
  if (chartMode === ChartMode.Day) return format(date, 'dd MMMM yyyy')
  if (chartMode === ChartMode.Week) {
    const endDate = new Date(date)
    endDate.setDate(date.getDate() + 7)
    return `${format(date, 'dd')}-${format(endDate, 'dd')} ${format(date, 'MMMM yyyy')}`
  }
  // Default to month
  return format(date, 'MMMM yyyy')
}

export function getChartMode(filters: MarketFilters) {
  if (filters.dueWithin && (filters.dueWithin as number) === 1) return ChartMode.OneDay
  if (filters.dueWithin && (filters.dueWithin as number) <= 30) return ChartMode.Day
  if (filters.dueWithin && (filters.dueWithin as number) <= 90) return ChartMode.Week
  return ChartMode.Month
}

export function formatLoansCurrencyBreakdown(
  data: LoansCurrencyBreakdown,
  theme: Theme
): LoansCurrencyBreakdownFormatted {
  return [
    {
      label: CurrencyTicker[Currency.WETH],
      value: data.weth || (0 as Amount),
      color: theme.palette.charts.darkPurple,
    },
    {
      label: CurrencyTicker[Currency.DAI],
      value: data.dai || (0 as Amount),
      color: theme.palette.charts.tonnedPurple,
    },
    {
      label: CurrencyTicker[Currency.USDC],
      value: data.usdc || (0 as Amount),
      color: theme.palette.charts.lightPurple,
    },
    {
      label: CurrencyTicker[Currency.WSTETH],
      value: data.wsteth || (0 as Amount),
      color: theme.palette.charts.white,
    },
  ]
}

export function formatLoansProtocolBreakdown(
  data: LoansProtocolBreakdown,
  theme: Theme
): LoansProtocolBreakdownFormatted {
  return [
    {
      label: ProtocolDisplayNames[Protocol.Nftfi],
      value: data.nftfi || (0 as Amount),
      color: theme.palette.charts.pink,
    },
    {
      label: ProtocolDisplayNames[Protocol.Gondi],
      value: data.gondi || (0 as Amount),
      color: theme.palette.charts.yellow,
    },
    {
      label: ProtocolDisplayNames[Protocol.X2y2],
      value: data.x2y2 || (0 as Amount),
      color: theme.palette.charts.orange,
    },
    {
      label: ProtocolDisplayNames[Protocol.Zharta],
      value: data.zharta || (0 as Amount),
      color: theme.palette.charts.green,
    },
    {
      label: ProtocolDisplayNames[Protocol.Arcade],
      value: data.arcade || (0 as Amount),
      color: theme.palette.charts.blue,
    },
    {
      label: ProtocolDisplayNames[Protocol.Metastreet],
      value: data.metastreet || (0 as Amount),
      color: theme.palette.charts.lightBlue,
    },
    {
      label: ProtocolDisplayNames[Protocol.Blur],
      value: data.blur || (0 as Amount),
      color: theme.palette.charts.purple,
    },
  ]
}

export function formatLoanStatsByCollection(data: LoansStatsByCollection[]): LoanStatsByCollectionFormatted {
  return data.map(item => ({
    label: item.name,
    percentage: item.share,
  }))
}

export function areStatsEmpty(
  data: LoansCurrencyBreakdown | LoansProtocolBreakdown | LoansStatsByCollection[] | LoansOverviewInfo | null,
  loading: boolean,
  error: Error | null
): boolean {
  return !data && !loading && !error
}

export function isManyDueDateLoanStatsEmpty(data: DueDateLoansStats[]): boolean {
  return (
    data.length === 0
    || data.every(item => isDueDateLoanStatsEmpty(item))
  )
}

export function isDueDateLoanStatsEmpty(data: DueDateLoansStats | null): boolean {
  if (!data) {
    return true
  }

  return (
    data.loanCount === 0
    && data.totalUsdValue === 0
    && data.avgUsdValue === 0
    && data.avgApr === 0
  )
}
