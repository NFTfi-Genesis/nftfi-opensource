import { Typography } from '@mui/material'
import { PanicError } from 'src/errors/PanicError'
import { config } from 'src/config/config'
import { Iconify } from 'src/components/Iconify'
import { Modal } from 'src/components/Modal/Modal'
import { Offer } from 'src/entities/domain/Offer'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { useOffersForNft } from 'src/services/hooks/offer/useOffersForNft'
import { Wei } from 'src/entities/base/Wei'
import { calculateRefinanceProceedsAtTerm } from 'src/utils/terms'
import { LoanExtended } from 'src/entities/app/LoanExtended'
import { NftExtended } from 'src/entities/app/NftExtended'
import { NftInfo } from 'src/entities/app/NftInfo'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { getCurrencyTicker } from 'src/utils/currencies'
import { Modals } from 'src/modules/modals/Modals'
import { NftHeader } from '../common/NftHeader'
import { ChecksContainer } from '../common/ChecksContainer'
import { ChecksProvider } from '../checks/ChecksProvider'
import { ReceiveNotifications } from '../common/ReceiveNotifications'
import { useReceiveNotificationsEmail } from '../common/useReceiveNotificationsEmail'
import { BalanceCheck } from '../checks/BalanceCheck'
import { LoginCheck } from '../checks/LoginCheck'
import { OfferTerms } from '../common/OfferTerms'
import { AllowanceCheck } from '../checks/AllowanceCheck'
import { MintORCheck } from '../checks/MintORCheck'
import { NftApprovalCheck } from '../checks/NftApprovalCheck'
import { RefinanceProceed } from '../common/RefinanceProceed'
import { RefiLoanModalActions } from './RefiLoanModalActions'

export type RefiLoanModalNftfiProps = {
  loan: LoanExtended<NftExtended<NftInfo | CollectionExtended<CollectionInfo>>>
  offerId: Offer['id']
}

export const RefiLoanModalNftfi = function RefiLoanModal(
  { loan, offerId }: RefiLoanModalNftfiProps,
) {
  const { t } = useTranslation()
  const { data: offers } = useOffersForNft({ nft: loan.nft, loan })
  const offer = offers?.find(offer => offer.id === offerId)
  const { field, fieldState, shouldShow, submitEmail } = useReceiveNotificationsEmail()

  if (!offer) {
    throw new PanicError({ message: 'Offer to refinance not found', details: { offerId, loanId: loan.loanId, offers: offers?.map(offer => offer.id).join(', ') } })
  }

  const fullTermDiff = calculateRefinanceProceedsAtTerm(
    offer.terms.principal,
    offer.terms.origination,
    loan.terms.repayment
  )
  const fullTermReceivedOnRefinance = (fullTermDiff < 0n
    ? -fullTermDiff
    : fullTermDiff) as Wei
  const needsToPay = fullTermDiff < 0n

  return (
    <Modal
      modal={Modals.RefiLoanNftfi}
      title={
        <>
          <Iconify width={24} icon='ph:arrows-clockwise' /> {t('borrow.accept-refinance-offer')}
        </>
      }
    >
      <NftHeader nft={loan.nft} />
      <Typography variant='subtitle1' sx={{ pt: 3, pb: 1 }}>
        {t('borrow.confirm-your-new-loan-terms')}
      </Typography>
      <OfferTerms offer={offer} />
      <RefinanceProceed loan={loan} offer={offer} />
      <ChecksProvider>
        <ChecksContainer title={t('borrow.loan-refinance-authorizations', { ticker: getCurrencyTicker(offer.terms.currency) })}>
          {needsToPay && <BalanceCheck currency={offer.terms.currency} amount={fullTermReceivedOnRefinance as Wei} />}
          <LoginCheck nft={loan.nft} />
          <AllowanceCheck
            currency={offer.terms.currency}
            spender={config.ethereum.contracts.nftfi.v3.refinance.address}
            amount={fullTermReceivedOnRefinance as Wei}
            max={true}
          />
          <NftApprovalCheck
            contractAddress={config.ethereum.contracts.nftfi.v3.obligationReceipt.address}
            operator={config.ethereum.contracts.nftfi.v3.refinance.address}
          />
          <MintORCheck loanId={loan.loanId} />
        </ChecksContainer>
        <ReceiveNotifications field={field} fieldState={fieldState} shouldShow={shouldShow} />
        <RefiLoanModalActions modal={Modals.RefiLoanNftfi} loan={loan} offer={offer} submitEmail={submitEmail} />
      </ChecksProvider>
    </Modal>
  )
}
