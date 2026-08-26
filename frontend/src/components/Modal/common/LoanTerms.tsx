import { useMemo } from 'react'
import { Stack, Typography } from '@mui/material'
import { format } from 'date-fns'

import { useTranslation } from 'src/modules/translation/useTranslation'
import { Loan } from 'src/entities/domain/Loan'
import { formatPercentage } from 'src/utils/numbers'
import { formatWei } from 'src/utils/amounts'
import { getCurrencyTicker } from 'src/utils/currencies'
import { secondaryFont } from 'src/modules/theme/typography'
import { TermRow } from './TermRow'

type LoanTermsProps = {
  loan: Loan
}

export function LoanTerms({ loan }: LoanTermsProps) {
  const { t } = useTranslation()
  const currency = loan.terms.currency
  const ticker = getCurrencyTicker(currency)
  const durationDays = loan.terms.duration
    ? Math.floor(loan.terms.duration / 86400)
    : null

  const { formattedDate, formattedTime } = useMemo(() => {
    if (!loan.dateDue) {
      return { formattedDate: null, formattedTime: null }
    }
    return {
      formattedDate: format(loan.dateDue, 'd MMM \'\'yy'),
      formattedTime: format(loan.dateDue, 'h:mm a zzz'),
    }
  }, [loan.dateDue])

  return (
    <Stack gap={2}>
      <TermRow label={t('borrow.due-by')}>
        {formattedDate && formattedTime
          ? (
            <Stack direction='row' gap={1} alignItems='baseline'>
              <Typography
                sx={{
                  fontFamily: secondaryFont,
                  fontSize: '16px',
                  fontWeight: 300,
                  lineHeight: '24px',
                  color: 'text.primary',
                }}
              >
                {formattedDate}
              </Typography>
              <Typography
                sx={{
                  fontFamily: secondaryFont,
                  fontSize: '14px',
                  fontWeight: 400,
                  lineHeight: '20px',
                  color: 'text.secondary',
                }}
              >
                {formattedTime}
              </Typography>
            </Stack>
          )
          : (
            <Typography variant='mono1' color='text.secondary'>
              {t('borrow.flexible')}
            </Typography>
          )}
      </TermRow>

      <TermRow label={t('borrow.principal')}>
        <Typography variant='mono1' color='text.primary'>
          {formatWei(loan.terms.principal, currency)}
        </Typography>
        <Typography variant='caption' color='text.secondary' sx={{ ml: 0.5 }}>
          {ticker}
        </Typography>
      </TermRow>

      <TermRow label={t('borrow.apr')}>
        <Typography variant='mono1' color='text.primary'>
          {formatPercentage(loan.terms.apr)}
        </Typography>
        <Typography variant='caption' color='text.secondary' sx={{ ml: 0.5 }}>
          %
        </Typography>
      </TermRow>

      <TermRow label={t('borrow.repayment')}>
        <Typography variant='mono1' color='text.primary'>
          {formatWei(loan.terms.repayment, currency)}
        </Typography>
        <Typography variant='caption' color='text.secondary' sx={{ ml: 0.5 }}>
          {ticker}
        </Typography>
      </TermRow>

      {durationDays !== null && (
        <TermRow label={t('borrow.duration')}>
          <Typography variant='mono1'>{durationDays}</Typography>
          <Typography variant='caption' color='text.secondary' sx={{ ml: 0.5 }}>
            {t('borrow.days')}
          </Typography>
        </TermRow>
      )}

      <TermRow label={t('borrow.loan-type')}>
        <Typography variant='mono1'>
          {loan.terms.duration === null
            ? t('borrow.flexible')
            : t('borrow.fixed')}
        </Typography>
      </TermRow>
    </Stack>
  )
}
