import { useTranslation } from 'src/modules/translation/useTranslation'
import { Loan } from 'src/entities/domain/Loan'
import { Offer } from 'src/entities/domain/Offer'
import { Protocol } from 'src/entities/domain/Protocol'
import { PanicError } from 'src/errors/PanicError'
import { useRefinanceLoan } from 'src/services/hooks/loan/useRefinanceLoan'
import { Wei } from 'src/entities/base/Wei'
import { GondiRefinanceData } from 'src/services/types/GondiRefinanceData'
import { Modals } from 'src/modules/modals/Modals'
import { useModals } from 'src/modules/modals/useModals'
import { Iconify } from 'src/components/Iconify'
import { calculateRepayment } from 'src/utils/terms'
import { NftExtended } from 'src/entities/app/NftExtended'
import { NftInfo } from 'src/entities/app/NftInfo'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { NotificationType, notify } from 'src/modules/notifications/notify'
import { ModalActions } from '../common/ModalActions'
import { GondiRepaymentData } from '../checks/GondiRepaymentSignatureCheck'

export type ModalActionsProps = {
  modal: Modals.RefiLoanNftfi | Modals.RefiLoanGondi
  loan: Loan
  offer: Offer
  refiData?: {
    encodedRepaymentData: GondiRepaymentData['encodedRepaymentData']
    loanContractAddress: GondiRefinanceData['loanContractAddress']
    repayment: Wei
  } | null
  submitEmail: () => Promise<boolean>
}

export function RefiLoanModalActions({ modal, loan, offer, refiData, submitEmail }: ModalActionsProps) {
  const { t } = useTranslation()
  const { send: refinanceLoan, isMutating } = useRefinanceLoan()
  const { close: closeRefiLoanModal } = useModals(modal)
  const { open: openSuccessLoanModal } = useModals(Modals.SuccessLoan)

  const handleRefinanceLoan = async () => {
    submitEmail()

    let result

    if (loan.protocol === Protocol.Gondi) {
      if (!refiData) {
        throw new PanicError({
          message: 'Gondi refinance requires refiData',
          details: { loanId: loan.loanId, protocol: loan.protocol },
        })
      }
      result = await refinanceLoan({
        loan,
        protocol: Protocol.Gondi,
        offer,
        refiData: {
          encodedRepaymentData: refiData.encodedRepaymentData,
          loanContractAddress: refiData.loanContractAddress,
        },
      })
    } else if (loan.protocol === Protocol.Nftfi) {
      result = await refinanceLoan({
        loan,
        protocol: Protocol.Nftfi,
        offer,
      })
    } else {
      throw new PanicError({
        message: `Unsupported protocol: ${loan.protocol}`,
        details: { loanId: loan.loanId, protocol: loan.protocol },
      })
    }

    if (result.success) {
      const proceeds = offer.terms.principal - offer.terms.origination - calculateRepayment(loan)
      const refiProceed = proceeds >= 0n
        ? (proceeds as Wei)
        : undefined
      notify({
        message: t('borrow.loan-refinanced-description'),
        variant: NotificationType.Success,
        duration: 30000,
      })
      openSuccessLoanModal({
        title: (
          <>
            <Iconify width={24} icon='ph:arrows-clockwise' /> {t('borrow.accept-refinance-offer')}
          </>
        ),
        nft: loan.nft as NftExtended<NftInfo | CollectionExtended<CollectionInfo>>,
        offer,
        refiProceed,
      })
      closeRefiLoanModal()
    }
  }

  return (
    <ModalActions
      modal={modal}
      onAction={handleRefinanceLoan}
      actionLabel='borrow.refinance'
      isDisabled={isMutating || !offer.signature}
      backLabel='borrow.view-loans'
      actionTooltipText={t('borrow.to-sign-this-offer')}
    />
  )
}
