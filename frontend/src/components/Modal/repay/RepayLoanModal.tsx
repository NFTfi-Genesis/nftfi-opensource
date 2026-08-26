import { Typography } from '@mui/material'
import { config } from 'src/config/config'
import { Iconify } from 'src/components/Iconify'
import { Modal } from 'src/components/Modal/Modal'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { getCurrencyTicker } from 'src/utils/currencies'
import { calculateRepayment } from 'src/utils/terms'
import { LoanExtended } from 'src/entities/app/LoanExtended'
import { NftExtended } from 'src/entities/app/NftExtended'
import { NftInfo } from 'src/entities/app/NftInfo'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { Modals } from 'src/modules/modals/Modals'
import { NftHeader } from '../common/NftHeader'
import { LoanTerms } from '../common/LoanTerms'
import { ChecksContainer } from '../common/ChecksContainer'
import { ChecksProvider } from '../checks/ChecksProvider'
import { ReceiveNotifications } from '../common/ReceiveNotifications'
import { useReceiveNotificationsEmail } from '../common/useReceiveNotificationsEmail'
import { BalanceCheck } from '../checks/BalanceCheck'
import { AllowanceCheck } from '../checks/AllowanceCheck'
import { RepayLoanModalActions } from './RepayLoanModalActions'

export type RepayLoanModalProps = {
  loan: LoanExtended<NftExtended<NftInfo | CollectionExtended<CollectionInfo>>>
}

export const RepayLoanModal = function RepayLoanModal(
  { loan }: RepayLoanModalProps,
) {
  const { t } = useTranslation()
  const repaymentAmount = calculateRepayment(loan)
  const { field, fieldState, shouldShow, submitEmail } = useReceiveNotificationsEmail()

  return (
    <Modal
      modal={Modals.Repay}
      title={
        <>
          <Iconify width={24} icon='ph:arrow-clockwise' /> {t('borrow.repay-loan')}
        </>
      }
    >
      <NftHeader nft={loan.nft} />
      <Typography variant='subtitle1' sx={{ pt: 3, pb: 1 }}>
        {t('borrow.loan-terms')}
      </Typography>
      <LoanTerms loan={loan} />
      <ChecksProvider>
        <ChecksContainer title={t('borrow.loan-repayment-authorizations', { ticker: getCurrencyTicker(loan.terms.currency) })}>
          <BalanceCheck currency={loan.terms.currency} amount={repaymentAmount} />
          <AllowanceCheck
            currency={loan.terms.currency}
            spender={config.ethereum.contracts.nftfi.v3.erc20Manager.address}
            amount={repaymentAmount}
            max={true}
          />
        </ChecksContainer>
        <ReceiveNotifications field={field} fieldState={fieldState} shouldShow={shouldShow} />
        <RepayLoanModalActions loanId={loan.loanId} submitEmail={submitEmail} />
      </ChecksProvider>
    </Modal>
  )
}
