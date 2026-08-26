import { Button, Stack } from '@mui/material'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { Loan } from 'src/entities/domain/Loan'
import { useModals } from 'src/modules/modals/useModals'
import { Modals } from 'src/modules/modals/Modals'
import { useLiquidateLoan } from 'src/services/hooks/loan/useLiquidateLoan'
import { NotificationType, notify } from 'src/modules/notifications/notify'
import { TermsAndConditions } from '../common/TermsAndConditions'

export function LiquidateLoanModalActions({ loan }: { loan: Loan }) {
  const { t } = useTranslation()
  const { close } = useModals(Modals.Liquidate)
  const { send: liquidateLoan, isMutating } = useLiquidateLoan()

  const handleLiquidateLoan = async () => {
    const result = await liquidateLoan(loan)
    if (result.success) {
      notify({
        message: t('borrow.loan-liquidated-description'),
        variant: NotificationType.Success,
        duration: 30000,
      })
      close()
    }
  }

  return (
    <Stack gap={2} mt={2}>
      <Stack direction='row' gap={2} justifyContent='flex-end' sx={{ width: '100%' }}>
        <Button
          variant='contained'
          color='primary'
          disabled={isMutating}
          onClick={handleLiquidateLoan}
          sx={{ flex: 1 }}
        >
          {t('borrow.foreclose')}
        </Button>
      </Stack>
      <TermsAndConditions />
    </Stack>
  )
}
