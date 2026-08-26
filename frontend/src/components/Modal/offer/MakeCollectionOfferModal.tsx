import { useCallback } from 'react'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { Amount } from 'src/entities/base/Amount'
import { Wei } from 'src/entities/base/Wei'
import { Seconds } from 'src/entities/base/Seconds'
import { TimestampSeconds } from 'src/entities/base/TimestampSeconds'
import { Percentage } from 'src/entities/base/Percentage'
import { OfferType } from 'src/entities/domain/Offer'
import { useMakeCollectionOffer } from 'src/services/hooks/offer/useMakeCollectionOffer'
import { amountToWei } from 'src/utils/amounts'
import { calculateMinEffectiveApr } from 'src/utils/terms'
import { Modal } from 'src/components/Modal/Modal'
import { Modals } from 'src/modules/modals/Modals'
import { useModals } from 'src/modules/modals/useModals'
import { CollectionHeader } from 'src/components/Modal/common/CollectionHeader'
import { FormData, MakeOfferForm } from './MakeOfferForm'

export type MakeCollectionOfferModalProps = {
  collection: CollectionExtended<CollectionInfo>
}

export const MakeCollectionOfferModal = function MakeCollectionOfferModal({ collection }: MakeCollectionOfferModalProps) {
  const { t } = useTranslation()

  const { send: makeOffer, isMutating } = useMakeCollectionOffer()
  const { close } = useModals(Modals.MakeCollectionOffer)

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

    const apr = (data.apr / 100) as Percentage
    const minEffectiveApr = calculateMinEffectiveApr({
      terms: {
        principal: principalWei,
        repayment: repaymentWei,
        origination: originationFeeWei,
        duration: durationSeconds,
      },
    })

    const offerParams = {
      collection,
      tokenRange: { from: collection.start, to: collection.end },
      terms: {
        duration: durationSeconds,
        repayment: repaymentWei,
        principal: principalWei,
        origination: originationFeeWei,
        currency: data.currency,
        isProRated: data.isFlexible,
        apr,
        effectiveApr: minEffectiveApr,
      },
      expiry: expiryTimestamp,
      type: OfferType.Collection as const,
    }

    const result = await makeOffer(offerParams)
    if (result.success) {
      close()
    }
  }, [makeOffer, collection, close])

  return (
    <Modal modal={Modals.MakeCollectionOffer} title={t('lend.make-collection-offer')} draggable>
      <CollectionHeader collection={collection} />
      <MakeOfferForm
        modal={Modals.MakeCollectionOffer}
        handleSubmit={handleSubmit}
        isMutating={isMutating}
        collection={collection}
      />
    </Modal>
  )
}
