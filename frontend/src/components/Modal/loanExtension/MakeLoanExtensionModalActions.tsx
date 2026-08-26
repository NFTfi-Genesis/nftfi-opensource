import { useMemo, useState } from 'react'
import { Stack, TextField, Typography } from '@mui/material'
import { format } from 'date-fns'
import { Amount } from 'src/entities/base/Amount'
import { Seconds } from 'src/entities/base/Seconds'
import { Currency } from 'src/entities/domain/Currency'
import { Loan } from 'src/entities/domain/Loan'
import { LoanExtensionOfferTerms } from 'src/entities/domain/LoanExtensionOffer'
import { Modals } from 'src/modules/modals/Modals'
import { useModals } from 'src/modules/modals/useModals'
import { NotificationType, notify } from 'src/modules/notifications/notify'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { useSignAndPostLoanExtensionOffer } from 'src/services/hooks/loanExtension/useSignAndPostLoanExtensionOffer'
import { secondaryFont } from 'src/modules/theme/typography'
import { amountToWei } from 'src/utils/amounts'
import { getCurrencyTicker } from 'src/utils/currencies'
import { ModalActions } from '../common/ModalActions'
import { TermRow } from '../common/TermRow'

const SECONDS_PER_DAY = 86400
const MAX_DUE_DATE_HORIZON_MS = 30 * SECONDS_PER_DAY * 1000

export type MakeLoanExtensionModalActionsProps = {
  loan: Loan
}

export function MakeLoanExtensionModalActions({ loan }: MakeLoanExtensionModalActionsProps) {
  const { t } = useTranslation()
  const { close } = useModals(Modals.LoanExtension)
  const { send: signAndPost, isMutating } = useSignAndPostLoanExtensionOffer()

  const currency = loan.terms.currency as Currency
  const ticker = getCurrencyTicker(currency)
  const currentDurationSeconds = loan.terms.duration ?? (0 as Seconds)
  const currentDurationDays = Math.floor(currentDurationSeconds / SECONDS_PER_DAY)
  const daysSinceStart = Math.ceil((Date.now() - loan.dateStarted.getTime()) / (1000 * SECONDS_PER_DAY))
  const minSafeDurationDays = Math.max(currentDurationDays, daysSinceStart) + 7

  const [durationDays, setDurationDays] = useState<string>(String(minSafeDurationDays))
  const [feeStr, setFeeStr] = useState<string>('0')

  const terms = useMemo<LoanExtensionOfferTerms | null>(() => {
    const durationNum = Number(durationDays)
    const feeNum = Number(feeStr || '0')
    if (!Number.isFinite(durationNum) || durationNum <= 0) return null
    if (!Number.isFinite(feeNum) || feeNum < 0) return null
    try {
      return {
        duration: (durationNum * SECONDS_PER_DAY) as Seconds,
        maxRepayment: loan.terms.repayment,
        fee: amountToWei(feeNum as Amount, currency),
        isProRated: loan.terms.isProRated ?? false,
      }
    } catch {
      return null
    }
  }, [durationDays, feeStr, currency, loan.terms.repayment, loan.terms.isProRated])

  const validationError = useMemo<string | null>(() => {
    if (!terms) return null
    if (terms.duration <= currentDurationSeconds) return t('lend.extension-must-be-longer')
    const newDueAt = loan.dateStarted.getTime() + terms.duration * 1000
    if (newDueAt <= Date.now()) return t('lend.extension-due-date-must-be-future')
    if (newDueAt > Date.now() + MAX_DUE_DATE_HORIZON_MS) return t('lend.extension-due-date-too-far')
    return null
  }, [terms, currentDurationSeconds, loan.dateStarted, t])

  const isValid = terms !== null && validationError === null

  const handleSubmit = async () => {
    if (!terms) return
    const result = await signAndPost({ loan, terms })
    if (result.success) {
      notify({ message: t('lend.extension-offer-sent'), variant: NotificationType.Success })
      close()
    }
  }

  return (
    <Stack gap={2} sx={{ pt: 2 }}>
      <Typography variant='subtitle1'>{t('lend.propose-extension')}</Typography>
      <Stack direction='row' gap={2}>
        <TextField
          label={t('lend.new-duration-days')}
          helperText={validationError ?? undefined}
          type='number'
          value={durationDays}
          onChange={e => setDurationDays(e.target.value)}
          error={Boolean(validationError)}
          fullWidth
          inputProps={{ 'data-test-id': 'extend-loan.duration' }}
        />
        <TextField
          label={`${t('lend.extension-fee')} (${ticker})`}
          value={feeStr}
          onChange={e => setFeeStr(e.target.value)}
          fullWidth
          inputProps={{ 'data-test-id': 'extend-loan.fee' }}
        />
      </Stack>
      {terms && !validationError && (() => {
        const newDueDate = new Date(loan.dateStarted.getTime() + terms.duration * 1000)
        return (
          <TermRow label={t('borrow.new-due-date')}>
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
                {format(newDueDate, 'd MMM \'\'yy')}
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
                {format(newDueDate, 'h:mm a zzz')}
              </Typography>
            </Stack>
          </TermRow>
        )
      })()}
      <ModalActions
        modal={Modals.LoanExtension}
        onAction={handleSubmit}
        actionLabel='lend.sign-offer'
        isDisabled={!isValid || isMutating}
      />
    </Stack>
  )
}
