import { Box, Stack, Typography } from '@mui/material'
import { AsyncPicture } from 'src/components/AsyncPicture'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { NftExtended } from 'src/entities/app/NftExtended'
import { NftInfo } from 'src/entities/app/NftInfo'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'

type NftHeaderProps = { nft: NftExtended<NftInfo | CollectionExtended<CollectionInfo>> }

export function NftHeader({ nft }: NftHeaderProps) {
  const imageUri = nft.info.imageUri
  const imageAlt = nft.info.name
  const collectionName = nft.collection.info.name

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
            {nft.info.name}
          </Typography>
          <Typography variant='subtitle2' color='text.secondary' noWrap>
            {collectionName}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  )
}
