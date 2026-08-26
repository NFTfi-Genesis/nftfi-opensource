import { memo } from 'react'
import { Stack, Typography, Link, Box } from '@mui/material'
import { AsyncPicture } from 'src/components/AsyncPicture'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { TooltipCollection } from 'src/components/TooltipCollection'
import { truncateText } from 'src/utils/strings'

type CollectionInfoDisplaySize = 'compact' | 'standard' | 'comfortable'

const sizeConfig: Record<CollectionInfoDisplaySize, { pictureSize: number }> = {
  compact: { pictureSize: 24 },
  standard: { pictureSize: 40 },
  comfortable: { pictureSize: 40 },
}

const collectionNameMaxChars = 32

export type CollectionInfoDisplayProps = {
  collection: CollectionExtended<CollectionInfo>
  collectionLink?: string
  size?: CollectionInfoDisplaySize
  limitCharacters?: boolean
}

export const CollectionInfoDisplay = memo(function CollectionInfoDisplay({
  collection,
  collectionLink,
  size = 'standard',
  limitCharacters = false,
}: CollectionInfoDisplayProps) {
  const { pictureSize } = sizeConfig[size]
  const collectionName = limitCharacters
    ? truncateText(collection.info.name, collectionNameMaxChars)
    : collection.info.name

  return (
    <Stack direction='row' spacing={2} alignItems='center' height='100%'>
      <TooltipCollection
        collection={collection}
      >
        <Box
          minWidth={pictureSize}
          minHeight={pictureSize}
          borderRadius='12px'
          overflow='hidden'
        >
          <AsyncPicture
            src={collection.info.imageUri}
            alt={collection.info.name}
            size={pictureSize}
            sx={{ objectFit: 'cover' }}
          />
        </Box>
      </TooltipCollection>
      <Stack justifyContent='center' overflow='hidden'>
        {collectionLink
          ? (
            <Link
              href={collectionLink}
              variant='body2'
              color='inherit'
              underline='hover'
              target='_blank'
              rel='noopener noreferrer'
              noWrap
            >
              {collectionName}
            </Link>
          )
          : (
            <Typography fontSize='14px' lineHeight='22px' noWrap>
              {collectionName}
            </Typography>
          )}
      </Stack>
    </Stack>
  )
})
