import { useState } from 'react'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { Loan } from 'src/entities/domain/Loan'
import { useRepayLoan } from 'src/services/hooks/loan/useRepayLoan'
import { Modals } from 'src/modules/modals/Modals'
import { NotificationType, notify } from 'src/modules/notifications/notify'
import { ModalActions } from '../common/ModalActions'

export function RepayLoanModalActions({ loanId, submitEmail }: { loanId: Loan['loanId'], submitEmail: () => Promise<boolean> }) {
  const { t } = useTranslation()
  const { send: repayLoan, isMutating } = useRepayLoan()
  const [success, setSuccess ] = useState(false)

  const handleRepayLoan = async () => {
    submitEmail()

    const result = await repayLoan(loanId)
    if (result.success) {
      setSuccess(true)
      notify({
        id:'loan-repaid',
        message: t('borrow.loan-repaid-description'),
        variant: NotificationType.Success,
        duration: 30000,
      })
    }
  }

  return (
    <ModalActions
      modal={Modals.Repay}
      onAction={handleRepayLoan}
      actionLabel='borrow.repay'
      isDisabled={isMutating || success}
      backLabel='borrow.view-loans'
      backLink='/borrow/my-loans'
      actionTooltipText={t('borrow.to-repay-this-loan')}
    />
  )
}
