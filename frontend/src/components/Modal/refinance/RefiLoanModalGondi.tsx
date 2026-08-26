import { Typography } from '@mui/material'
import { config } from 'src/config/config'
import { Iconify } from 'src/components/Iconify'
import { Modal } from 'src/components/Modal/Modal'
import { Offer } from 'src/entities/domain/Offer'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { useOffersForNft } from 'src/services/hooks/offer/useOffersForNft'
import { Wei } from 'src/entities/base/Wei'
import { useSignGondiRepayment } from 'src/services/hooks/loan/useSignGondiRepayment'
import { calculateRefinanceProceedsAtTerm } from 'src/utils/terms'
import { LoanExtended } from 'src/entities/app/LoanExtended'
import { NftExtended } from 'src/entities/app/NftExtended'
import { NftInfo } from 'src/entities/app/NftInfo'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { getCurrencyTicker } from 'src/utils/currencies'
import { Modals } from 'src/modules/modals/Modals'
import { PanicError } from 'src/errors/PanicError'
import { NftHeader } from '../common/NftHeader'
import { ChecksContainer } from '../common/ChecksContainer'
import { ChecksProvider } from '../checks/ChecksProvider'
import { ReceiveNotifications } from '../common/ReceiveNotifications'
import { useReceiveNotificationsEmail } from '../common/useReceiveNotificationsEmail'
import { BalanceCheck } from '../checks/BalanceCheck'
import { LoginCheck } from '../checks/LoginCheck'
import { OfferTerms } from '../common/OfferTerms'
import { GondiRepaymentSignatureCheck } from '../checks/GondiRepaymentSignatureCheck'
import { AllowanceCheck } from '../checks/AllowanceCheck'
import { NftApprovalCheck } from '../checks/NftApprovalCheck'
import { RefinanceProceed } from '../common/RefinanceProceed'
import { RefiLoanModalActions } from './RefiLoanModalActions'

export type RefiLoanModalGondiProps = {
  loan: LoanExtended<NftExtended<NftInfo | CollectionExtended<CollectionInfo>>>
  offerId: Offer['id']
}

export const RefiLoanModalGondi = function RefiLoanModalGondi({ loan, offerId }: RefiLoanModalGondiProps) {
  const { t } = useTranslation()
  const { data: refiData, send: signGondiRepayment } = useSignGondiRepayment()
  const { data: offers } = useOffersForNft({ nft: loan.nft, loan })
  const offer = offers?.find(offer => offer.id === offerId)
  const { field, fieldState, shouldShow, submitEmail } = useReceiveNotificationsEmail()

  if (!offer) {
    throw new PanicError({ message: 'Offer to refinance gondi loan not found', details: { offerId, loanId: loan.loanId, offers: offers?.map(offer => offer.id).join(', ') } })
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
      modal={Modals.RefiLoanGondi}
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
          <GondiRepaymentSignatureCheck
            hash={loan.loanStartTx}
            onSign={signGondiRepayment}
            signatureData={refiData}
          />
          {refiData?.loanContractAddress && (
            <AllowanceCheck
              currency={offer.terms.currency}
              spender={refiData?.loanContractAddress}
              amount={refiData?.repayment as Wei}
            />
          )}
          <AllowanceCheck
            currency={offer.terms.currency}
            spender={config.ethereum.contracts.nftfi.v3.refinance.address}
            amount={fullTermReceivedOnRefinance as Wei}
            max={true}
          />
          <NftApprovalCheck
            contractAddress={loan.nft.address}
            operator={config.ethereum.contracts.nftfi.v3.refinance.address}
          />
        </ChecksContainer>
        <ReceiveNotifications field={field} fieldState={fieldState} shouldShow={shouldShow} />
        <RefiLoanModalActions modal={Modals.RefiLoanGondi} loan={loan} offer={offer} refiData={refiData} submitEmail={submitEmail} />
      </ChecksProvider>
    </Modal>
  )
}
