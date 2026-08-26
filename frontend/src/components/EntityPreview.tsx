import { Box, IconButton, Stack } from '@mui/material'
import { useContext } from 'react'
import { useBreakpoints } from 'src/modules/theme/useBreakpoints'
import { NftInfoDisplay, NftInfoDisplayProps } from './NftInfoDisplay'
import { EntityDetailsDisplay, EntityDetailsItem } from './EntityDetailsDisplay'
import { CollectionInfoDisplay, CollectionInfoDisplayProps } from './CollectionInfoDisplay'
import { MultiActionButton, MultiActionButtonAction } from './MultiActionButton/MultiActionButton'
import { Iconify } from './Iconify'
import { SplitViewContext } from './Views/SplitView'

export type DataDetail = {
  label: string
  content: string
}

export type EntityPreviewProps = {
  nftDetails?: NftInfoDisplayProps | null
  collectionDetails?: CollectionInfoDisplayProps | null
  entityDetails?: EntityDetailsItem[] | null
  prioritisedActions?: MultiActionButtonAction[] | null
}

export function EntityPreview({
  nftDetails,
  collectionDetails,
  entityDetails,
  prioritisedActions,
}: EntityPreviewProps) {
  const { isMobileOrLaptopView } = useBreakpoints()
  const { closeRightPanel: onClose } = useContext(SplitViewContext)

  return (
    <Stack
      direction={isMobileOrLaptopView
        ? 'column'
        : 'row'}
      spacing={2}
      alignItems='center'
      paddingTop={isMobileOrLaptopView
        ? '2px'
        : 0}
      paddingLeft={isMobileOrLaptopView
        ? 0
        : 2}
      sx={{
        minWidth: 0, // Allow flex item to shrink below content size
        overflow: 'hidden', // Prevent outer container from scrolling
      }}
      width='100%'
    >
      <Stack
        direction='row'
        alignItems='center'
        spacing={2}
        alignSelf={isMobileOrLaptopView
          ? 'flex-start'
          : 'auto'}
        justifyContent={isMobileOrLaptopView
          ? 'flex-start'
          : 'flex-start'}
        width={isMobileOrLaptopView
          ? '100%'
          : 'auto'}
      >
        {onClose && isMobileOrLaptopView && <Box sx={{ flexShrink: 0 }}>
          <IconButton onClick={onClose}
            sx={{
              backgroundColor: 'background.neutral',
              paddingX: 2.5,
              paddingY: 1.5,
              borderRadius: 1,
            }}
          >
            <Iconify icon='ph:arrow-left' width={24} />
          </IconButton>
        </Box>}
        {prioritisedActions && (
          <Box sx={{ flexShrink: 0, flexGrow: 1 }}>
            <MultiActionButton prioritisedActions={prioritisedActions} variant='contained' />
          </Box>
        )}
        {nftDetails && (
          <Box sx={{ flexShrink: 0 }} maxWidth='200px'>
            <NftInfoDisplay
              nft={nftDetails.nft}
              nftLink={nftDetails.nftLink}
              limitCharacters
            />
          </Box>
        )}
        {collectionDetails && (
          <Box sx={{ flexShrink: 0 }}>
            <CollectionInfoDisplay
              collection={collectionDetails.collection}
              limitCharacters
            />
          </Box>
        )}
      </Stack>
      <Box width='100%' sx={{ flex: 1, minWidth: 0 }}>
        {entityDetails && <EntityDetailsDisplay terms={entityDetails} />}
      </Box>
      {onClose && !isMobileOrLaptopView && <Box sx={{ flexShrink: 0 }}>
        <IconButton onClick={onClose}
          sx={{
            backgroundColor: 'transparent',
            paddingX: 2.5,
            paddingY: 1.5,
            borderRadius: 1,
          }}
        >
          <Iconify icon='ph:x' />
        </IconButton>
      </Box>}
    </Stack>
  )
}
