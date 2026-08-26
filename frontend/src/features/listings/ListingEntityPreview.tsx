import { TFunction } from 'src/modules/translation/TFunction'
import { EntityDetailsItem } from 'src/components/EntityDetailsDisplay'
import { getListingPreferenceOptionsDisplayText } from 'src/utils/listings'
import { EntityPreview } from 'src/components/EntityPreview'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { Listing } from 'src/entities/domain/Listing'
import { ListingExtended } from 'src/entities/app/ListingExtended'
import { NftExtended } from 'src/entities/app/NftExtended'
import { NftInfo } from 'src/entities/app/NftInfo'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'

function listingToEntityDetails(listing: Listing, t: TFunction): EntityDetailsItem[] {
  const details: EntityDetailsItem[] = []

  // Des. Duration
  details.push({
    title: t('borrow.des-duration'),
    content: `${listing.desiredTerms.duration} ${t('borrow.days')}`,
  })

  // Des. Currency
  if (listing.desiredTerms.currency) {
    details.push({
      title: t('borrow.des-currency'),
      content: listing.desiredTerms.currency,
    })
  }

  // Des. Loan Type (Pro-rated)
  if (listing.desiredTerms.isProRated !== null) {
    details.push({
      title: t('borrow.des-loan-type'),
      content: listing.desiredTerms.isProRated
        ? t('borrow.flexible')
        : t('borrow.fixed'),
    })
  }

  // Loan Preference
  details.push({
    title: t('borrow.preference'),
    content: getListingPreferenceOptionsDisplayText(listing.desiredTerms.preference, t),
  })

  return details
}

export type ListingEntityPreviewProps = {
  listing: ListingExtended<NftExtended<NftInfo | CollectionExtended<CollectionInfo>>>
}

export function ListingEntityPreview({ listing }: ListingEntityPreviewProps) {
  const { t } = useTranslation()
  return (
    <EntityPreview
      nftDetails={{ nft: listing.nft }}
      entityDetails={listingToEntityDetails(listing, t)}
    />
  )
}
