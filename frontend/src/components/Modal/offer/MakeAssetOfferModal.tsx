import { useCallback } from 'react'
import { NftExtended } from 'src/entities/app/NftExtended'
import { NftInfo } from 'src/entities/app/NftInfo'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { Amount } from 'src/entities/base/Amount'
import { Wei } from 'src/entities/base/Wei'
import { Seconds } from 'src/entities/base/Seconds'
import { TimestampSeconds } from 'src/entities/base/TimestampSeconds'
import { OfferType } from 'src/entities/domain/Offer'
import { useMakeAssetOffer } from 'src/services/hooks/offer/useMakeAssetOffer'
import { amountToWei } from 'src/utils/amounts'
import { Modal } from 'src/components/Modal/Modal'
import { useModals } from 'src/modules/modals/useModals'
import { NftHeader } from 'src/components/Modal/common/NftHeader'
import { Modals } from 'src/modules/modals/Modals'
import { Address } from 'src/entities/base/Address'
import { FormData, MakeOfferForm } from './MakeOfferForm'

export type MakeAssetOfferModalProps = {
  nft: NftExtended<NftInfo | CollectionExtended<CollectionInfo>>
  borrower: Address
}

export const MakeAssetOfferModal = function MakeOfferModal({ nft, borrower }: MakeAssetOfferModalProps) {
  const { t } = useTranslation()

  const { send: makeOffer, isMutating } = useMakeAssetOffer()
  const { close } = useModals(Modals.MakeAssetOffer)

  const handleSubmit = useCallback(async (data: FormData) => {
    const interestRate = (data.apr / 100) * (data.duration / 365)
    const repaymentAmount = data.principal * (1 + interestRate)
    const principalWei = amountToWei(data.principal as Amount, data.currency)
    const repaymentWei = amountToWei(repaymentAmount as Amount, data.currency)
    const originationFeeWei = data.originationFee > 0
      ? amountToWei(data.originationFee as Amount, data.currency)
      : (0n as Wei)
    const durationSeconds = (data.duration * 24 * 60 * 60) as Seconds
    const expiryTimestamp = (Math.floor(Date.now() / 1000) + (data.offerExpiry * 24 * 60 * 60)) as TimestampSeconds

    const offerParams = {
      nft,
      terms: {
        duration: durationSeconds,
        repayment: repaymentWei,
        principal: principalWei,
        origination: originationFeeWei,
        currency: data.currency,
        isProRated: data.isFlexible,
      },
      expiry: expiryTimestamp,
      type: OfferType.Asset as const,
      borrower,
    }

    const result = await makeOffer(offerParams)
    if (result.success) {
      close()
    }
  }, [makeOffer, nft, close, borrower])

  return (
    <Modal modal={Modals.MakeAssetOffer} title={t('lend.make-offer')} draggable>
      <NftHeader nft={nft} />
      <MakeOfferForm
        modal={Modals.MakeAssetOffer}
        handleSubmit={handleSubmit}
        isMutating={isMutating}
        collection={nft.collection}
      />
    </Modal>
  )
}
