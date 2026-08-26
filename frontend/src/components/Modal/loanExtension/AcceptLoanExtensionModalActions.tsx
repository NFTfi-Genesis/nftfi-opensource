import { useState } from 'react'
import { Box, Button, Stack, Typography } from '@mui/material'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { Iconify } from 'src/components/Iconify'
import { Wei } from 'src/entities/base/Wei'
import { Currency } from 'src/entities/domain/Currency'
import { Loan } from 'src/entities/domain/Loan'
import { LoanExtensionOffer } from 'src/entities/domain/LoanExtensionOffer'
import { Modals } from 'src/modules/modals/Modals'
import { useModals } from 'src/modules/modals/useModals'
import { NotificationType, notify } from 'src/modules/notifications/notify'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { useAcceptLoanExtensionOffer } from 'src/services/hooks/loanExtension/useAcceptLoanExtensionOffer'
import { secondaryFont } from 'src/modules/theme/typography'
import { formatWeiLong } from 'src/utils/amounts'
import { getCurrencyTicker } from 'src/utils/currencies'
import { getTestId } from 'src/utils/testing'
import { ModalActions } from '../common/ModalActions'
import { TermRow } from '../common/TermRow'
import { TermsAndConditions } from '../common/TermsAndConditions'

const SECONDS_PER_DAY = 86400

export type AcceptLoanExtensionModalActionsProps = {
  loan: Loan
  offer: LoanExtensionOffer
}

export function AcceptLoanExtensionModalActions({ loan, offer }: AcceptLoanExtensionModalActionsProps) {
  const { t } = useTranslation()
  const { close } = useModals(Modals.AcceptLoanExtension)
  const { send: acceptOffer, isMutating: isAccepting } = useAcceptLoanExtensionOffer()
  const [isAccepted, setIsAccepted] = useState(false)

  const currency = loan.terms.currency as Currency
  const ticker = getCurrencyTicker(currency)
  const hasFee = offer.terms.fee > 0n
  const newDueDate = new Date(loan.dateStarted.getTime() + offer.terms.duration * 1000)

  const handleAccept = async () => {
    const result = await acceptOffer({ offer, loan })
    if (result.success) {
      notify({
        message: t('borrow.extension-offer-accepted'),
        variant: NotificationType.Success,
        duration: 30000,
      })
      setIsAccepted(true)
    }
  }

  return (
    <Stack gap={2} sx={{ pt: 2 }}>
      <Typography variant='subtitle1'>{t('borrow.extension-offer')}</Typography>
      <Stack gap={2}>
        <TermRow label={t('borrow.duration')}>
          <Typography variant='mono1' color='text.primary'>
            {Math.floor(offer.terms.duration / SECONDS_PER_DAY)}
          </Typography>
          <Typography variant='caption' color='text.secondary' sx={{ ml: 0.5 }}>
            {t('borrow.days')}
          </Typography>
        </TermRow>
        <TermRow label={t('lend.extension-fee')}>
          <Typography variant='mono1' color='text.primary'>
            {formatWeiLong(offer.terms.fee as Wei, currency)}
          </Typography>
          <Typography variant='caption' color='text.secondary' sx={{ ml: 0.5 }}>
            {ticker}
          </Typography>
        </TermRow>
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
      </Stack>
      {isAccepted
        ? (
          <Box display='grid' gridTemplateColumns='1fr' gap={2} sx={{ width: '100%', mt: 2 }}>
            <Button
              variant='outlined'
              component={Link}
              to='/borrow/my-loans'
              startIcon={<Iconify icon='ph:arrow-left' width={20} />}
              onClick={close}
              {...getTestId('view-extension.go-to-my-loans')}
            >
              {t('borrow.view-loan')}
            </Button>
          </Box>
        )
        : hasFee
          ? (
            <ModalActions
              modal={Modals.AcceptLoanExtension}
              onAction={handleAccept}
              actionLabel='borrow.accept-extension'
              isDisabled={isAccepting}
            />
          )
          : (
            <Stack gap={2} mt={2}>
              <Button
                variant='contained'
                color='primary'
                disabled={isAccepting}
                onClick={handleAccept}
                fullWidth
              >
                {t('borrow.accept-extension')}
              </Button>
              <TermsAndConditions />
            </Stack>
          )}
    </Stack>
  )
}
