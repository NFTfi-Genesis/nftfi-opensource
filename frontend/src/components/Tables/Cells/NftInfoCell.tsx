import { memo } from 'react'
import { useTableDensity } from 'src/components/Tables/useTableDensity'
import { NftInfoDisplay } from 'src/components/NftInfoDisplay'
import { NftExtended } from 'src/entities/app/NftExtended'
import { NftInfo } from 'src/entities/app/NftInfo'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'

export type NftInfoCellProps = {
  nft: NftExtended<NftInfo | CollectionExtended<CollectionInfo>>
  nftLink?: string
}

export const NftInfoCell = memo(function NftInfoCellDashboard({
  nft,
  nftLink,
}: NftInfoCellProps) {
  const density = useTableDensity()

  return (
    <NftInfoDisplay
      nft={nft}
      nftLink={nftLink}
      size={density}
      showTestId
    />
  )
})
