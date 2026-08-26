import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { formatAmountCompact } from 'src/utils/amounts'
import { getTestId } from 'src/utils/testing'
import { Amount } from 'src/entities/base/Amount'

type TooltipLoansDueProps = {
  formattedDate: string
  loanCount: number
  totalUsdValue: Amount
  index: number
}

export function TooltipLoansDue({
  formattedDate,
  loanCount,
  totalUsdValue,
  index,
}: TooltipLoansDueProps) {
  const { t } = useTranslation()
  return (
    <Stack direction='column' spacing={2} sx={{ padding: 1 }}>
      <Typography variant='h6'>{formattedDate}</Typography>
      <Stack direction='row' spacing={7}>
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
        <Typography
          {...getTestId(`overview.maturing.chart.usd.${index}`, totalUsdValue)}
          variant='mono1'
        >{`$${formatAmountCompact(totalUsdValue)}`}</Typography>
      </Stack>
    </Stack>
  )
}
