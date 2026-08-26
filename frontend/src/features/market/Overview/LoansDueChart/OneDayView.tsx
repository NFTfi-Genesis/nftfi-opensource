import { Stack, Box, Typography } from '@mui/material'
import { format } from 'date-fns'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { formatAmountCompact } from 'src/utils/amounts'
import { ColumnChartDateProps } from './LoansDueChart'

export function OneDayView({ data }: ColumnChartDateProps) {
  const { t } = useTranslation()
  const { date, loanCount, totalUsdValue } = data[0]
  return (
    <Stack direction='column' spacing={5} alignItems='center' marginTop={2}>
      <Stack direction='row' spacing={7} justifyContent='center'>
        <Stack direction='row' spacing={1} alignItems='center'>
          <Box
            sx={{
              width: 12,
              height: 12,
              backgroundColor: theme => theme.palette.primary.main,
              borderRadius: '50%',
            }}
          />
          <Typography variant='body1'>{`${loanCount} ${t('dashboard.overview.loans-due')}`}</Typography>
        </Stack>
        <Typography variant='mono1'>{`$${formatAmountCompact(totalUsdValue)}`}</Typography>
      </Stack>
      <Typography
        variant='mono1'
        sx={{ color: theme => theme.palette.text.secondary }}
      >
        {format(date, 'EEEE dd MMMM yyyy')}
      </Typography>
    </Stack>
  )
}
