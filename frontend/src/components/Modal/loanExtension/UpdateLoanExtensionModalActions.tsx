import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { format } from 'date-fns'
import { Wei } from 'src/entities/base/Wei'
import { Currency } from 'src/entities/domain/Currency'
import { Loan } from 'src/entities/domain/Loan'
import { LoanExtensionOffer } from 'src/entities/domain/LoanExtensionOffer'
import { Modals } from 'src/modules/modals/Modals'
import { useChecks } from 'src/components/Modal/checks/ChecksProvider'
import { useModals } from 'src/modules/modals/useModals'
import { NotificationType, notify } from 'src/modules/notifications/notify'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { useRevokeLoanExtensionOffer } from 'src/services/hooks/loanExtension/useRevokeLoanExtensionOffer'
import { formatWei } from 'src/utils/amounts'
import { getCurrencyTicker } from 'src/utils/currencies'
import { getTestId } from 'src/utils/testing'

const SECONDS_PER_DAY = 86400

export type UpdateLoanExtensionModalActionsProps = {
  loan: Loan
  offer: LoanExtensionOffer
  onReplace: () => void
}

export function UpdateLoanExtensionModalActions({ loan, offer, onReplace }: UpdateLoanExtensionModalActionsProps) {
  const { t } = useTranslation()
  const { close } = useModals(Modals.LoanExtension)
  const { send: revoke, isMutating: isRevoking } = useRevokeLoanExtensionOffer()
  const { areAllChecksPassed } = useChecks()

  const currency = loan.terms.currency as Currency
  const ticker = getCurrencyTicker(currency)
  const offerDurationDays = Math.floor(offer.terms.duration / SECONDS_PER_DAY)
  const offerDueDate = new Date(loan.dateStarted.getTime() + offer.terms.duration * 1000)

  const handleRevoke = async () => {
    const result = await revoke(offer)
    if (result.success) {
      notify({ message: t('lend.extension-offer-revoked'), variant: NotificationType.Success })
      close()
    }
  }

  return (
    <Stack gap={2} sx={{ pt: 2 }}>
      <Typography variant='subtitle1'>{t('lend.you-have-an-active-extension-offer')}</Typography>
      <Stack gap={1}>
        <Row label={t('borrow.duration')} value={`${offerDurationDays} days`} />
        <Row label={t('lend.extension-fee')} value={`${formatWei(offer.terms.fee as Wei, currency)} ${ticker}`} />
        <Row label={t('borrow.new-due-date')} value={format(offerDueDate, 'd MMM yyyy')} />
      </Stack>
      <Box display='grid' gridTemplateColumns='1fr 1fr' gap={2} sx={{ width: '100%', mt: 2 }}>
        <Button
          variant='outlined'
          onClick={handleRevoke}
          disabled={isRevoking || !areAllChecksPassed}
          {...getTestId('extend-loan.revoke-offer')}
        >
          {isRevoking
            ? <CircularProgress size={18} />
            : t('lend.revoke-offer')}
        </Button>
        <Button
          variant='contained'
          onClick={onReplace}
          disabled={isRevoking || !areAllChecksPassed}
          {...getTestId('extend-loan.replace-offer')}
        >
          {t('lend.replace-offer')}
        </Button>
      </Box>
    </Stack>
  )
}

function Row({ label, value }: { label: string, value: string }) {
  return (
    <Stack direction='row' justifyContent='space-between'>
      <Typography variant='body2' color='text.secondary'>{label}</Typography>
      <Typography variant='body2'>{value}</Typography>
    </Stack>
  )
}
