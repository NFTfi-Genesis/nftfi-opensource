import { Box, Stack, Skeleton } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useLocalStorage } from 'src/modules/localStorage/useLocalStorage'
import { LocalStorageKeys } from 'src/modules/localStorage/config'
import { Amount } from 'src/entities/base/Amount'
import {
  ChartMode,
} from '../utils'
import { RetryPanel } from '../RetryPanel'
import { OneDayView } from './OneDayView'
import { Chart } from './ChartView'

export type ColumnChartDateProps = {
  data: {
    date: string
    loanCount: number
    totalUsdValue: Amount
  }[]
  chartMode: ChartMode
  loading?: boolean
  error?: boolean
}

export function LoansDueChart({ data, chartMode, loading, error }: ColumnChartDateProps) {
  const oneDayView = data.length === 1

  const height = oneDayView
    ? 100
    : 110

  if (error) {
    return <LoansDueChartRetryPanel />
  }

  return (
    <Box sx={{ width: '100%', height }}>
      {loading
        ? (
          <LoansDueChartSkeleton />
        )
        : oneDayView
          ? (
            <OneDayView data={data} chartMode={chartMode} />
          )
          : (
            <Chart data={data} chartMode={chartMode} />
          )}
    </Box>
  )
}

export function LoansDueChartSkeleton() {
  const [overviewExpanded] = useLocalStorage(
    LocalStorageKeys.DashboardUserPreferences.OverviewExpanded
  )
  const labelsAmount = overviewExpanded
    ? 4
    : 2

  return (
    <Box sx={{ width: '100%', height: 200 }}>
      <Stack direction='column' spacing={1} justifyContent='space-between'>
        <Skeleton variant='rounded' height={100} />
        <Stack direction='row' spacing={7}>
          {Array.from({ length: labelsAmount }).map((_, index) => (
            <LabelLoading key={index} />
          ))}
        </Stack>
      </Stack>
    </Box>
  )
}

function LoansDueChartRetryPanel() {
  const [overviewExpanded] = useLocalStorage(
    LocalStorageKeys.DashboardUserPreferences.OverviewExpanded
  )
  const labelsAmount = overviewExpanded
    ? 4
    : 2

  return (
    <Stack direction='column' spacing={1} justifyContent='space-between'>
      <RetryPanel height={100}/>
      <Stack direction='row' spacing={7}>
        {Array.from({ length: labelsAmount }).map((_, index) => (
          <LabelError key={index} />
        ))}
      </Stack>
    </Stack>
  )
}

function LabelLoading() {
  return (
    <Skeleton variant='rectangular' height={18} sx={{ borderRadius: '4px' }}/>
  )
}

function LabelError() {
  return (
    <Skeleton variant='rectangular' height={18} sx={{ borderRadius: '4px', bgcolor: theme => alpha(theme.palette.error.main, 0.08) }}/>
  )
}
