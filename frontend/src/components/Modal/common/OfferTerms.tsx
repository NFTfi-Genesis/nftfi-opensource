import { Stack, Tooltip, Typography } from '@mui/material'
import { format } from 'date-fns'
import { useMemo } from 'react'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { Iconify } from 'src/components/Iconify'
import { Offer } from 'src/entities/domain/Offer'
import { Wei } from 'src/entities/base/Wei'
import { formatPercentage } from 'src/utils/numbers'
import { formatWei } from 'src/utils/amounts'
import { getCurrencyTicker } from 'src/utils/currencies'
import { TermRow } from './TermRow'

type RefiLoanTermsProps = {
  offer: Offer
}

export function OfferTerms({ offer }: RefiLoanTermsProps) {
  const { t } = useTranslation()
  const currency = offer.terms.currency
  const ticker = getCurrencyTicker(currency)
  const durationDays = Math.floor(offer.terms.duration / 86400)
  const loanType = offer.terms.isProRated
    ? t('borrow.flexible')
    : t('borrow.fixed')

  const principalNetOfOF = (offer.terms.principal - offer.terms.origination) as Wei

  const formattedDueDate = useMemo(() => {
    const date = new Date()
    date.setSeconds(date.getSeconds() + offer.terms.duration)
    return format(date, "d MMM ''yy h:mm a zzz")
  }, [offer.terms.duration])

  return (
    <Stack gap={2}>
      <TermRow
        label={
          <Stack direction='row' gap={0.5} alignItems='center'>
            <Typography variant='body1' color='text.secondary'>
              {t('borrow.principal')}
            </Typography>
            <Tooltip title={t('borrow.principal-calculation-tooltip')} placement='top'>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <Iconify icon='ph:info' width={16} sx={{ color: 'text.secondary' }} />
              </span>
            </Tooltip>
          </Stack>
        }
      >
        <Typography variant='mono1' color='text.secondary'>
          {formatWei(offer.terms.principal, currency)}{' '}
          -{' '}
          {formatWei(offer.terms.origination, currency)}
        </Typography>
        <Typography variant='mono1' color='text.primary'>
          {' '}= {formatWei(principalNetOfOF, currency)}
        </Typography>
        <Typography variant='caption' color='text.secondary' sx={{ ml: 0.5 }}>
          {ticker}
        </Typography>
      </TermRow>

      <TermRow label={t('borrow.origination-fee')}>
        <Typography variant='mono1' color='text.primary'>
          -{formatWei(offer.terms.origination, currency)}
        </Typography>
        <Typography variant='caption' color='text.secondary' sx={{ ml: 0.5 }}>
          {ticker}
        </Typography>
      </TermRow>

      <TermRow
        label={
          <>
            <Typography variant='body1' color='text.disabled'>
              {t('borrow.apr')}
            </Typography>
            <Typography variant='body1' color='text.secondary'>
              {' '}/ {t('borrow.effective-apr')}
            </Typography>
          </>
        }
      >
        <Typography variant='mono1' color='text.secondary'>
          {formatPercentage(offer.terms.apr)}
        </Typography>
        <Typography variant='caption' color='text.disabled' sx={{ ml: 0.5 }}>
          %
        </Typography>
        <Typography variant='mono1' color='text.secondary' sx={{ mx: 0.5 }}>
          /
        </Typography>
        <Typography variant='mono1' color='text.primary'>
          {formatPercentage(offer.terms.effectiveApr)}
        </Typography>
        <Typography variant='caption' color='text.secondary' sx={{ ml: 0.5 }}>
          %
        </Typography>
      </TermRow>

      <TermRow label={t('borrow.loan-type')}>
        <Typography variant='mono1'>{loanType}</Typography>
      </TermRow>

      <TermRow label={t('borrow.duration')}>
        <Typography variant='mono1'>{durationDays}</Typography>
        <Typography variant='caption' color='text.secondary' sx={{ ml: 0.5 }}>
          {t('borrow.days')}
        </Typography>
        <Typography variant='caption' color='text.secondary' sx={{ ml: 0.5 }}>
          ({t('borrow.due')}{' '}
          <Typography component='span' variant='caption' color='text.primary'>
            {formattedDueDate}
          </Typography>
          )
        </Typography>
      </TermRow>

      <TermRow label={t(offer.terms.isProRated
        ? 'borrow.max-repayment'
        : 'borrow.repayment')}>
        <Typography variant='mono1' color='text.primary'>
          {formatWei(offer.terms.repayment, currency)}
        </Typography>
        <Typography variant='caption' color='text.secondary' sx={{ ml: 0.5 }}>
          {ticker}
        </Typography>
      </TermRow>
    </Stack>
  )
}
