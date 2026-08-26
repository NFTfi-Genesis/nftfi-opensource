import { Divider, Stack, Tooltip, Typography } from '@mui/material'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { Loan } from 'src/entities/domain/Loan'
import { Offer } from 'src/entities/domain/Offer'
import { Iconify } from 'src/components/Iconify'
import { formatWei } from 'src/utils/amounts'
import { Wei } from 'src/entities/base/Wei'
import { getCurrencyTicker } from 'src/utils/currencies'
import { calculateRepayment } from 'src/utils/terms'

type RefinanceProceedProps = {
  loan: Loan
  offer: Offer
}

export function RefinanceProceed({ loan, offer }: RefinanceProceedProps) {
  const { t } = useTranslation()
  const currency = offer.terms.currency

  const proceeds = offer.terms.principal - offer.terms.origination - calculateRepayment(loan)
  const isPositive = proceeds >= 0n
  const displayAmount = isPositive
    ? proceeds
    : -proceeds

  const label = isPositive
    ? t('borrow.received-on-refinance')
    : t('borrow.paid-on-refinance')

  const tooltip = isPositive
    ? t('borrow.received-on-refinance-tooltip')
    : t('borrow.paid-on-refinance-tooltip')

  return (
    <Stack gap={2}>
      <Divider sx={{ my: 0, height: 10 }} />
      <Stack direction='row' justifyContent='space-between' alignItems='center'>
        <Stack direction='row' gap={0.5} alignItems='center'>
          <Typography variant='body1' color='text.primary'>
            {label}
          </Typography>
          <Tooltip title={tooltip} placement='top'>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <Iconify icon='ph:info' width={16} sx={{ color: 'text.secondary' }} />
            </span>
          </Tooltip>
        </Stack>
        <Stack direction='row' gap={0.5} alignItems='baseline'>
          <Typography variant='mono1' fontWeight={700} color='text.primary'>
            {formatWei(displayAmount as Wei, currency)}
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            {getCurrencyTicker(currency)}
          </Typography>
        </Stack>
      </Stack>
    </Stack>
  )
}
