import { memo } from 'react'
import { Stack, Typography, Link, Box } from '@mui/material'
import { AsyncPicture } from 'src/components/AsyncPicture'
import { TooltipNft } from 'src/components/TooltipNft'
import { getTestId } from 'src/utils/testing'
import { NftExtended } from 'src/entities/app/NftExtended'
import { NftInfo } from 'src/entities/app/NftInfo'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { truncateText } from 'src/utils/strings'

type NftInfoDisplaySize = 'compact' | 'standard' | 'comfortable'

const sizeConfig: Record<NftInfoDisplaySize, { pictureSize: number, collectionNameMarginTop: number }> = {
  compact: { pictureSize: 24, collectionNameMarginTop: -0.75 },
  standard: { pictureSize: 40, collectionNameMarginTop: 0.5 },
  comfortable: { pictureSize: 40, collectionNameMarginTop: 1 },
}

const nftNameMaxChars = 32
const collectionNameMaxChars = 32

export type NftInfoDisplayProps = {
  nft: NftExtended<NftInfo | CollectionExtended<CollectionInfo>>
  nftLink?: string
  size?: NftInfoDisplaySize
  showTestId?: boolean
  limitCharacters?: boolean
}

export const NftInfoDisplay = memo(function NftInfoDisplay({
  nft,
  nftLink,
  size = 'standard',
  showTestId = false,
  limitCharacters = false,
}: NftInfoDisplayProps) {
  const { pictureSize, collectionNameMarginTop } = sizeConfig[size]
  const nftName = limitCharacters
    ? truncateText(nft.info.name, nftNameMaxChars)
    : nft.info.name
  const collectionName = limitCharacters
    ? truncateText(nft.collection.info.name, collectionNameMaxChars)
    : nft.collection.info.name

  return (
    <Stack direction='row' spacing={2} alignItems='center' height='100%'>
      <TooltipNft
        nft={nft}
      >
        <Box
          minWidth={pictureSize}
          minHeight={pictureSize}
          borderRadius='12px'
          overflow='hidden'
        >
          <AsyncPicture
            src={nft.info.imageUri}
            alt={nft.info.name}
            size={pictureSize}
            sx={{ objectFit: 'cover' }}
          />
        </Box>
      </TooltipNft>
      <Stack justifyContent='center' overflow='hidden'>
        {nftLink
          ? (
            <Link
              href={nftLink}
              variant='body2'
              color='inherit'
              underline='hover'
              target='_blank'
              rel='noopener noreferrer'
              noWrap
              {...getTestId('table.cell.assetName')}
            >
              {nftName}
            </Link>
          )
          : (
            <Typography fontSize='14px' lineHeight='22px' noWrap {...getTestId('table.cell.assetName')}>
              {nftName}
            </Typography>
          )}
        <Typography
          mt={collectionNameMarginTop}
          variant='caption'
          noWrap
          {...(showTestId
            ? getTestId('table.cell.collectionName')
            : {})}
        >
          {collectionName}
        </Typography>
      </Stack>
    </Stack>
  )
})
