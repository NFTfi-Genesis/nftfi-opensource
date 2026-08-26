import { useEffect, useId, useMemo } from 'react'
import { Box, Typography, useTheme } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { Currency } from 'src/entities/domain/Currency'
import { Amount } from 'src/entities/base/Amount'
import { Collection } from 'src/entities/domain/Collection'
import { useCollectionMarketInfo } from 'src/services/hooks/collection/useCollectionMarketInfo'
import { useFxRate } from 'src/services/hooks/ethereum/useFxRate'
import { formatAmount } from 'src/utils/amounts'
import { getCurrencyTicker } from 'src/utils/currencies'
import { getTestId } from 'src/utils/testing'
import { useChecks } from './ChecksProvider'

export type FloorPriceWarningCheckProps = {
  collection: Collection
  principal: Amount
  currency: Currency.WETH | Currency.USDC
}

export function FloorPriceWarningCheck({ collection, principal, currency }: FloorPriceWarningCheckProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const { registerCheck, unregisterCheck } = useChecks()
  const checkId = useId()
  const { data: collectionMarketInfo, isLoading: isLoadingMarketInfo } = useCollectionMarketInfo(collection, {
    revalidateOnFocus: false,
  })
  const { data: fxRate, isLoading: isLoadingFxRate } = useFxRate()

  const isLoading = isLoadingMarketInfo || isLoadingFxRate

  // Normalize principal and floor values to USD using FX rate for comparison
  const principalInUsd = useMemo(() => {
    if (!fxRate) return null
    if (currency === Currency.USDC) {
      return principal
    }
    return (principal * fxRate) as Amount
  }, [principal, currency, fxRate])

  const floorPriceInUsd = useMemo(() => {
    if (!collectionMarketInfo?.market.floor || !fxRate) return null
    const floorPrice = collectionMarketInfo.market.floor
    if (floorPrice.currency === Currency.WETH) {
      return (floorPrice.amount * fxRate) as Amount
    }
    return floorPrice.amount
  }, [collectionMarketInfo, fxRate])

  const isAboveFloor = useMemo(() => {
    if (principalInUsd === null || floorPriceInUsd === null) return false
    return principalInUsd > floorPriceInUsd
  }, [principalInUsd, floorPriceInUsd])

  const checkState = useMemo(() => {
    if (isLoading || principalInUsd === null || floorPriceInUsd === null) return 'loading'
    return isAboveFloor
      ? 'incomplete'
      : 'already-done'
  }, [isLoading, principalInUsd, floorPriceInUsd, isAboveFloor])

  useEffect(() => {
    registerCheck(checkId, checkState, t('lend.floor-price-warning-title'), 'floor-price-warning', true)
    return () => unregisterCheck(checkId)
  }, [registerCheck, unregisterCheck, checkId, checkState, t])

  if (isLoading || !isAboveFloor) {
    return null
  }

  if (!fxRate) return null

  const floorPrice = collectionMarketInfo?.market.floor
  if (!floorPrice) return null

  const principalAmount = formatAmount(principal, currency)
  const principalCurrency = getCurrencyTicker(currency)

  const floorPriceAmountValue = floorPrice.currency === currency
    ? floorPrice.amount
    : currency === Currency.USDC
      ? (floorPrice.amount * fxRate) as Amount
      : (floorPrice.amount / fxRate) as Amount
  const floorPriceAmount = formatAmount(floorPriceAmountValue, currency)
  const floorPriceCurrency = getCurrencyTicker(currency)

  return (
    <Box
      {...getTestId('modal.checks.warning')}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 0.5,
        borderRadius: 1,
        backgroundColor: alpha(theme.palette.error.main, 0.32),
        gridColumn: 'span 2',
        mt: 1,
      }}
    >
      <Box sx={{ width: 0, height: 22 }} />
      <Typography
        variant='body2'
        sx={{
          color: alpha(theme.palette.common.white, 0.8),
          textAlign: 'center',
        }}
      >
        {t('lend.floor-price-warning-message', {
          principalAmount,
          principalCurrency,
        })}
        <Typography
          component='span'
          variant='body2'
          sx={{
            color: theme.palette.text.primary,
            fontWeight: 500,
          }}
        >
          {t('lend.floor-price-warning-message-highlight', {
            floorPriceAmount,
            floorPriceCurrency,
          })}
        </Typography>
      </Typography>
      <Box sx={{ width: 0, height: 22 }} />
    </Box>
  )
}
