import { Box, Stack, Typography } from '@mui/material'
import { AsyncPicture } from 'src/components/AsyncPicture'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'

type CollectionHeaderProps = { collection: CollectionExtended<CollectionInfo> }

export function CollectionHeader({ collection }: CollectionHeaderProps) {
  const imageUri = collection.info.imageUri
  const imageAlt = collection.info.name
  const collectionName = collection.info.name

  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        borderRadius: 1.5,
        px: 0,
        pr: 2,
      }}
    >
      <Stack direction='row' gap={2} alignItems='center'>
        <AsyncPicture
          src={imageUri}
          alt={imageAlt}
          size={106}
          sx={{
            borderRadius: 1.5,
            flexShrink: 0,
          }}
        />
        <Stack justifyContent='center' gap={0.5} flex={1} minWidth={0}>
          <Typography variant='subtitle1' noWrap>
            {collectionName}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  )
}
