import { isAssetOffer, isCollectionOffer, isContractOffer } from 'src/utils/offers'
import { AssetOfferExtended, CollectionOfferExtended } from 'src/entities/app/OfferExtended'
import { ContractOffer } from 'src/entities/domain/Offer'
import { AssetOrCollectionInfoCell } from './AssetOrCollectionInfoCell'

export type OfferInfoCellProps = {
  offer: AssetOfferExtended
  | CollectionOfferExtended
  | ContractOffer
}

export function OfferInfoCell({ offer }: OfferInfoCellProps) {
  if (isAssetOffer(offer)) {
    return (
      <AssetOrCollectionInfoCell
        nft={offer.nft}
      />
    )
  }

  if (isCollectionOffer(offer) || isContractOffer(offer)) {
    return (
      <AssetOrCollectionInfoCell
        collection={offer.collection}
      />
    )
  }

  return (
    <AssetOrCollectionInfoCell
      fallback='Unknown'
    />
  )
}
