import { useState } from 'react'
import { Box, Typography, Tooltip, Skeleton, Stack, Link } from '@mui/material'
import { AsyncPicture } from 'src/components/AsyncPicture'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { formatAmountByCurrencyName } from 'src/utils/amounts'
import { useNftMarketInfo } from 'src/services/hooks/nft/useNftMarketInfo'
import { useCollectionMarketInfo } from 'src/services/hooks/collection/useCollectionMarketInfo'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { NftExtended } from 'src/entities/app/NftExtended'
import { NftInfo } from 'src/entities/app/NftInfo'
import OpenseaLogo from 'src/assets/images/svg/opensea-logo.svg'

export type TooltipNftProps = {
  nft: NftExtended<NftInfo | CollectionExtended<CollectionInfo>>
  children: React.ReactElement
}

export function TooltipNft({
  nft,
  children,
}: TooltipNftProps) {
  const { t } = useTranslation()
  const [isTooltipOpen, setIsTooltipOpen] = useState(false)

  const { data: nftMarketInfo, isLoading: isNftMarketInfoLoading } = useNftMarketInfo(nft, { shouldExecute: isTooltipOpen })

  const { data: collectionMarketInfo, isLoading: isCollectionMarketInfoLoading } = useCollectionMarketInfo(nft.collection, { shouldExecute: isTooltipOpen })

  const handleTooltipOpen = () => {
    setIsTooltipOpen(true)
  }

  const handleTooltipClose = () => {
    setIsTooltipOpen(false)
  }

  return (
    <Tooltip
      title={
        <Box
          display='flex'
          flexDirection='column'
          alignItems='center'
          textAlign='left'
          gap={1}
          padding={0.1}
        >
          <Stack direction='row' alignItems='center' gap={1} justifyContent='space-between' width='100%'>
            <Typography variant='h5' alignSelf='flex-start' maxWidth='100%' noWrap>
              {nft.info.name}
            </Typography>
            <Link href={`https://opensea.io/item/ethereum/${nft.address}/${nft.id.toString()}`} target='_blank' rel='noopener noreferrer' color='common.white'>
              <OpenseaLogo width={20} height={20}/>
            </Link>
          </Stack>
          <AsyncPicture
            src={nft.info.imageUri}
            alt={nft.info.name}
            size={260}
            sx={{ borderRadius: 2 }}
          />
          <Box
            display='grid'
            gridTemplateColumns='1fr 1fr'
            width='100%'
            gap={2}
          >
            <Box
              display='flex'
              flexDirection='column'
              gap={0}
              alignItems='flex-start'
            >
              <Typography variant='caption'>
                {t('dashboard.asset-tooltip.top-offer')}
              </Typography>
              {isCollectionMarketInfoLoading
                ? (<Skeleton width={80} height={20} />)
                : ( <Typography variant='subtitle1'>
                  {/* {assetInfo?.topOffer?.amount && assetInfo.topOffer.currency
                    ? `${formatAmountByCurrencyName(assetInfo.topOffer.amount, assetInfo.topOffer.currency)} ${assetInfo.topOffer.currency}`
                    : '-'} */}
                  {collectionMarketInfo?.market?.topOffer?.amount
                  && collectionMarketInfo?.market?.topOffer?.currency
                    ? `${formatAmountByCurrencyName(
                      collectionMarketInfo.market.topOffer.amount,
                      collectionMarketInfo.market.topOffer.currency
                    )} ${collectionMarketInfo.market.topOffer.currency}`
                    : '-'}
                </Typography>
                )}
            </Box>
            <Box
              display='flex'
              flexDirection='column'
              gap={0}
              alignItems='flex-start'
            >
              <Typography variant='caption'>
                {t('dashboard.asset-tooltip.collection-floor')}
              </Typography>
              {isCollectionMarketInfoLoading
                ? (
                  <Skeleton width={80} height={20} />
                )
                : (
                  <Typography variant='subtitle1'>
                    {collectionMarketInfo?.market?.floor?.amount
                      ? `${formatAmountByCurrencyName(collectionMarketInfo.market.floor.amount, collectionMarketInfo.market.floor.currency)} ${collectionMarketInfo.market.floor.currency}`
                      : '-'}
                  </Typography>
                )}
            </Box>
            <Box
              display='flex'
              flexDirection='column'
              gap={0}
              alignItems='flex-start'
            >
              <Typography variant='caption'>
                {t('dashboard.asset-tooltip.rarity')}
              </Typography>
              {isNftMarketInfoLoading
                ? (
                  <Skeleton width={80} height={20} />
                )
                : (
                  <Typography variant='subtitle2'>
                    {nftMarketInfo?.rarity
                      ? `#${nftMarketInfo?.rarity}`
                      : '-'}
                  </Typography>
                )}
            </Box>
            <Box
              display='flex'
              flexDirection='column'
              gap={0}
              alignItems='flex-start'
            >
              <Typography variant='caption'>
                {t('dashboard.asset-tooltip.last-sale')}
              </Typography>
              {isNftMarketInfoLoading
                ? (
                  <Skeleton width={80} height={20} />
                )
                : (
                  <Typography variant='subtitle2'>
                    {nftMarketInfo?.lastSale?.amount && nftMarketInfo.lastSale.currency
                      ? `${formatAmountByCurrencyName(nftMarketInfo.lastSale.amount, nftMarketInfo.lastSale.currency)} ${nftMarketInfo.lastSale.currency}`
                      : '-'}
                  </Typography>
                )}
            </Box>
          </Box>
        </Box>
      }
      placement='top'
      slotProps={{
        popper: {
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [160, -40],
              },
            },
          ],
        },
        tooltip: {
          sx: {
            minWidth: '308px',
            maxWidth: '308px',
          },
        },
      }}
      onOpen={handleTooltipOpen}
      onClose={handleTooltipClose}
    >
      {children}
    </Tooltip>
  )
}
