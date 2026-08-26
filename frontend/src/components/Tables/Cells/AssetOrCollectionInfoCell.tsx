import { memo } from 'react'
import { Typography } from '@mui/material'
import { CollectionInfoCell, CollectionInfoCellProps } from './CollectionInfoCell'
import { NftInfoCell, NftInfoCellProps } from './NftInfoCell'

export type AssetOrCollectionInfoCellProps = NftInfoCellProps | CollectionInfoCellProps | {
  fallback: string | React.ReactNode
}

export const AssetOrCollectionInfoCell = memo(function AssetOrCollectionInfoCell(props: AssetOrCollectionInfoCellProps) {
  if ('nft' in props) {
    return (
      <NftInfoCell
        nft={props.nft}
        nftLink={props.nftLink}
      />
    )
  }

  if ('collection' in props) {
    return (
      <CollectionInfoCell
        collection={props.collection}
        collectionLink={props.collectionLink}
      />
    )
  }

  if (typeof props.fallback === 'string') {
    return (
      <Typography variant='body2'>
        {props.fallback}
      </Typography>
    )
  }

  return props.fallback
})
