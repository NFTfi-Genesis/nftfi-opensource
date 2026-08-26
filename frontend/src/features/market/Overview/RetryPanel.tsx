import { Button, Stack } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useLoansProtocolBreakdown } from 'src/services/hooks/overview/useLoansProtocolBreakdown'
import { useLoansCurrencyBreakdown } from 'src/services/hooks/overview/useLoansCurrencyBreakdown'
import { useLoansOverviewInfo } from 'src/services/hooks/overview/useLoansOverviewInfo'
import { Iconify } from 'src/components/Iconify'
import { useMarketFilters } from 'src/features/market/tables/useMarketFilters'
import { useCollectionLoansStats } from 'src/services/hooks/overview/useCollectionLoansStats'
import { useDueDateLoansStats } from 'src/services/hooks/overview/useDueDateLoansStats'

export function RetryPanel({ width = '100%', height = '100%'}: { width?: string | number, height?: string | number }) {
  const { filters } = useMarketFilters()
  const { refresh: refreshLoanStatsByDueDate } = useDueDateLoansStats({
    filters,
  })
  const { refresh: refreshLoansOverviewInfo } = useLoansOverviewInfo({
    filters,
  })
  const { refresh: refreshLoansCurrencyBreakdown } = useLoansCurrencyBreakdown({
    filters,
  })
  const { refresh: refreshLoansProtocolBreakdown } = useLoansProtocolBreakdown({
    filters,
  })
  const { refresh: refreshLoanStatsByCollection } = useCollectionLoansStats({
    filters,
  })

  return (
    <Stack
      sx={{
        padding: 2,
        width,
        height,
        borderRadius: '8px',
        bgcolor:  theme => alpha(theme.palette.error.main, 0.08),
      }}
      justifyContent='center'
      alignItems='center'
    >
      <Button
        variant='outlined'
        color='error'
        size='small'
        sx={{ maxWidth: 'fit-content' }}
        startIcon={<Iconify icon='ph:warning' />}
        onClick={() => {
          refreshLoanStatsByDueDate()
          refreshLoansOverviewInfo()
          refreshLoansCurrencyBreakdown()
          refreshLoansProtocolBreakdown()
          refreshLoanStatsByCollection()
        }}
      >
        Retry
      </Button>
    </Stack>
  )
}
