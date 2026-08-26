import { memo } from 'react'
import { useTableDensity } from 'src/components/Tables/useTableDensity'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { CollectionInfoDisplay } from 'src/components/CollectionInfoDisplay'

export type CollectionInfoCellProps = {
  collection: CollectionExtended<CollectionInfo>
  collectionLink?: string
}

export const CollectionInfoCell = memo(function CollectionInfoCell({
  collection,
  collectionLink,
}: CollectionInfoCellProps) {
  const density = useTableDensity()

  return (
    <CollectionInfoDisplay
      collection={collection}
      collectionLink={collectionLink}
      size={density}
    />
  )
})
