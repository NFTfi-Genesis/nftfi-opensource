import { useCallback, useMemo } from 'react'
import { EntityPreview } from 'src/components/EntityPreview'
import { CollectionStats } from 'src/entities/app/CollectionStats'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { useModals } from 'src/modules/modals/useModals'
import { Modals } from 'src/modules/modals/Modals'
import { CollectionMarketInfo } from 'src/entities/app/CollectionMarketInfo'
import { formatAmount } from 'src/utils/amounts'
import { Currency } from 'src/entities/domain/Currency'
import { formatPercentage } from 'src/utils/numbers'
import { getCurrencyTicker } from 'src/utils/currencies'
import { getTestId } from 'src/utils/testing'

export function CollectionEntityPreview({ collection }: { collection: CollectionExtended<CollectionInfo | CollectionStats | CollectionMarketInfo> }) {
  const { t } = useTranslation()
  const { open: openMakeCollectionOfferModal } = useModals(Modals.MakeCollectionOffer)

  const handleMakeOffer = useCallback(() => {
    openMakeCollectionOfferModal({ collection })
  }, [openMakeCollectionOfferModal, collection])

  const floorDisplay = useMemo(() => {
    if (!collection.market.floor) return '-'
    return `${formatAmount(collection.market.floor.amount, collection.market.floor.currency, { compactThreshold: 7 })} ${getCurrencyTicker(collection.market.floor.currency)}`
  }, [collection.market.floor])

  return (
    <EntityPreview
      collectionDetails={{ collection }}
      prioritisedActions={[{ label: t('lend.make-offer'), onClick: handleMakeOffer, ...getTestId('lend.make-offer') }]}
      entityDetails={[
        {
          title: t('collections.floor'),
          content: floorDisplay,
        },
        {
          title: t('collections.volume'),
          content: `${formatAmount(collection.stats.totalLoanAmount, Currency.USD, { compactThreshold: 7 })} ${getCurrencyTicker(Currency.USD)}`,
        },
        {
          title: t('collections.avg-apr'),
          content: `${formatPercentage(collection.stats.avgApr)}%`,
        },
      ]}
    />
  )
}
