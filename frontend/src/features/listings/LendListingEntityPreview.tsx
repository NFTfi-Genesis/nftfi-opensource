import { useMemo } from 'react'

import { TFunction } from 'src/modules/translation/TFunction'
import { EntityDetailsItem } from 'src/components/EntityDetailsDisplay'
import { EntityPreview } from 'src/components/EntityPreview'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { ListingExtended } from 'src/entities/app/ListingExtended'
import { NftExtended } from 'src/entities/app/NftExtended'
import { NftInfo } from 'src/entities/app/NftInfo'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { CollectionMarketInfo } from 'src/entities/app/CollectionMarketInfo'
import { LoansStatsByCollection } from 'src/entities/app/LoansStatsByCollection'
import { useCollectionLoansStats } from 'src/services/hooks/overview/useCollectionLoansStats'
import { useAllActiveCollections } from 'src/services/hooks/collection/useAllActiveCollections'
import { formatPercentage, formatAvg } from 'src/utils/numbers'
import { formatAmount } from 'src/utils/amounts'
import { useCollectionMarketInfo } from 'src/services/hooks/collection/useCollectionMarketInfo'
import { MultiActionButtonAction } from 'src/components/MultiActionButton/MultiActionButton'

function buildEntityDetails(
  // TODO: included only for compatibility with the useCollectionLoansStats hook, eventually remove and use CollectionExtended<CollectionMarketInfo | CollectionStats>
  stats: LoansStatsByCollection | undefined,
  collectionMarketInfo: CollectionExtended<CollectionMarketInfo> | null | undefined,
  t: TFunction
): EntityDetailsItem[] {
  const details: EntityDetailsItem[] = []

  // Collection Floor
  details.push({
    title: t('lend.collection-floor'),
    content: collectionMarketInfo?.market?.floor?.amount
      ? `${formatAmount(collectionMarketInfo.market.floor.amount, collectionMarketInfo.market.floor.currency)} ${collectionMarketInfo.market.floor.currency}`
      : '-',
  })

  details.push({
    title: t('lend.avg-usdc-principal'),
    content: stats
      ? `${formatAvg(stats.avgUsdValue)} USDC`
      : '-',
  })

  details.push({
    title: t('lend.avg-apr'),
    content: stats
      ? `${formatPercentage(stats.avgApr)}%`
      : '-',
  })

  return details
}

export type LendListingEntityPreviewProps = {
  listing: ListingExtended<NftExtended<NftInfo | CollectionExtended<CollectionInfo>>>
  prioritisedActions?: MultiActionButtonAction[] | null
}

export function LendListingEntityPreview({ listing, prioritisedActions }: LendListingEntityPreviewProps) {
  const { t } = useTranslation()
  const collectionName = listing.nft.collection.info.name
  const { data: collectionMarketInfo } = useCollectionMarketInfo(listing.nft.collection)

  // TODO: replace this with a per-collection asset-service endpoint; the analytics endpoint
  // returns stats for every collection just to pluck one row.
  const { data: allCollections } = useAllActiveCollections({ filters: {} })
  const collectionIds = useMemo<string[]>(() => {
    if (!allCollections) return []
    const match = allCollections.find(c => c.info.name.toLowerCase() === collectionName.toLowerCase())
    return match
      ? [match.id]
      : []
  }, [allCollections, collectionName])

  const { data: collectionStats } = useCollectionLoansStats(
    { filters: { collectionIds } },
    { shouldExecute: collectionIds.length > 0 }
  )

  const stats = useMemo(() => {
    if (!collectionStats || collectionStats.length === 0) return undefined
    return collectionStats[0]
  }, [collectionStats])

  const entityDetails = useMemo(
    () => buildEntityDetails(stats, collectionMarketInfo, t),
    [stats, collectionMarketInfo, t]
  )

  return (
    <EntityPreview
      nftDetails={{ nft: listing.nft }}
      entityDetails={entityDetails}
      prioritisedActions={prioritisedActions}
    />
  )
}
