import { Typography } from '@mui/material'
import { config } from 'src/config/config'
import { Iconify } from 'src/components/Iconify'
import { Modal } from 'src/components/Modal/Modal'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { NftExtended } from 'src/entities/app/NftExtended'
import { NftInfo } from 'src/entities/app/NftInfo'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { Offer } from 'src/entities/domain/Offer'
import { useOffersForNft } from 'src/services/hooks/offer/useOffersForNft'
import { getCurrencyTicker } from 'src/utils/currencies'
import { Modals } from 'src/modules/modals/Modals'
import { PanicError } from 'src/errors/PanicError'
import { ReceiveNotifications } from '../common/ReceiveNotifications'
import { useReceiveNotificationsEmail } from '../common/useReceiveNotificationsEmail'
import { NftHeader } from '../common/NftHeader'
import { ChecksContainer } from '../common/ChecksContainer'
import { NftApprovalCheck } from '../checks/NftApprovalCheck'
import { LoginCheck } from '../checks/LoginCheck'
import { OfferTerms } from '../common/OfferTerms'
import { ChecksProvider } from '../checks/ChecksProvider'
import { StartLoanModalActions } from './StartLoanModalActions'

export type StartLoanModalProps = {
  nft: NftExtended<NftInfo | CollectionExtended<CollectionInfo>>
  offerId: Offer['id']
}

export const StartLoanModal = function StartLoanModal({ nft, offerId }: StartLoanModalProps) {
  const { t } = useTranslation()
  const { data: offersData } = useOffersForNft({ nft })
  const offer = offersData?.find(offer => offer.id === offerId)
  const { field, fieldState, shouldShow, submitEmail } = useReceiveNotificationsEmail()

  if (!offer) {
    throw new PanicError({ message: 'Offer to start a new loan not found', details: { offerId, nftId: nft.id, offers: offersData?.map(offer => offer.id).join(', ') } })
  }

  return (
    <Modal
      title={
        <>
          <Iconify width={24} icon='ph:arrow-down-left' /> {t('borrow.start-a-new-loan')}
        </>
      }
      modal={Modals.StartLoan}
    >
      <NftHeader nft={nft} />
      <Typography variant='subtitle1' sx={{ pt: 3, pb: 1 }}>
        {t('borrow.confirm-loan-terms')}
      </Typography>
      <OfferTerms offer={offer} />
      <ChecksProvider>
        <ChecksContainer title={t('borrow.new-loan-authorizations', { ticker: getCurrencyTicker(offer.terms.currency) })}>
          <LoginCheck nft={nft} />
          <NftApprovalCheck
            contractAddress={nft.address}
            operator={config.ethereum.contracts.nftfi.v3.escrow.address}
            tokenId={nft.id}
          />
        </ChecksContainer>
        <ReceiveNotifications field={field} fieldState={fieldState} shouldShow={shouldShow} />
        <StartLoanModalActions offer={offer} nft={nft} submitEmail={submitEmail} />
      </ChecksProvider>
    </Modal>
  )
}
