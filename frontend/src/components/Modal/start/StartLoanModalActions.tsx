import { useTranslation } from 'src/modules/translation/useTranslation'
import { Offer } from 'src/entities/domain/Offer'
import { useStartLoan } from 'src/services/hooks/loan/useStartLoan'
import { useModals } from 'src/modules/modals/useModals'
import { Modals } from 'src/modules/modals/Modals'
import { Iconify } from 'src/components/Iconify'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { NftExtended } from 'src/entities/app/NftExtended'
import { NftInfo } from 'src/entities/app/NftInfo'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { NotificationType, notify } from 'src/modules/notifications/notify'
import { ModalActions } from '../common/ModalActions'

export type ModalActionsProps = {
  offer: Offer
  nft: NftExtended<NftInfo | CollectionExtended<CollectionInfo>>
  submitEmail: () => Promise<boolean>
}

export function StartLoanModalActions({ offer, nft, submitEmail }: ModalActionsProps) {
  const { t } = useTranslation()
  const { send: startLoan, isMutating } = useStartLoan()
  const { close: closeStartLoanModal } = useModals(Modals.StartLoan)
  const { open: openSuccessLoanModal } = useModals(Modals.SuccessLoan)

  const handleStartLoan = async () => {
    submitEmail()

    const result = await startLoan({ offer, nft })

    if (result.success) {
      notify({
        message: t('borrow.loan-started-description'),
        variant: NotificationType.Success,
        duration: 30000,
      })
      openSuccessLoanModal({
        title: (
          <>
            <Iconify width={24} icon='ph:arrow-down-left' /> {t('borrow.start-a-new-loan')}
          </>
        ),
        nft,
        offer,
      })
      closeStartLoanModal()
    }
  }

  return (
    <ModalActions
      modal={Modals.StartLoan}
      onAction={handleStartLoan}
      actionLabel='borrow.start-loan'
      isDisabled={isMutating || !offer.signature}
      backLabel='borrow.view-offers'
      actionTooltipText={t('borrow.to-sign-this-offer')}
    />
  )
}
