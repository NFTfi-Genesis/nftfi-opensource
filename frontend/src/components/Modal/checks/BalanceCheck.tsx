import { useEffect, useId, useRef, useMemo } from 'react'
import { Box, Button, Typography, useTheme } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { Currency } from 'src/entities/domain/Currency'
import { Wei } from 'src/entities/base/Wei'
import { useWallet } from 'src/modules/wallet/useWallet'
import { useBalance } from 'src/services/hooks/ethereum/useBalance'
import { getCurrencyTicker } from 'src/utils/currencies'
import { formatWei } from 'src/utils/amounts'
import { getTestId } from 'src/utils/testing'
import { useChecks } from './ChecksProvider'

export type BalanceCheckProps = {
  currency: Currency
  amount: Wei
  optional?: boolean
}

export function BalanceCheck({ currency, amount, optional = false }: BalanceCheckProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const { walletAddress } = useWallet()
  const { data: balance, refresh, isLoading } = useBalance(currency, walletAddress)
  const { registerCheck, unregisterCheck, getDisplayState } = useChecks()
  const baseId = useId()
  const checkId = useMemo(() => `${baseId}-${currency}-${amount.toString()}`, [baseId, currency, amount])

  const currentBalance = balance ?? (0n as Wei)
  const isSufficient = currentBalance >= amount
  const deficit = (amount - currentBalance) as Wei
  const ticker = getCurrencyTicker(currency)

  const wasInitiallySufficient = useRef<boolean | null>(null)

  useEffect(() => {
    wasInitiallySufficient.current = null
  }, [checkId])

  if (wasInitiallySufficient.current === null && balance !== undefined && !isLoading) {
    wasInitiallySufficient.current = isSufficient
  }

  const balanceCheckLabel = optional
    ? t('borrow.have-sufficient-balance-optional-offer', { ticker })
    : t('borrow.have-sufficient-balance', { ticker })

  useEffect(() => {
    const baseState = isLoading
      ? 'loading'
      : wasInitiallySufficient.current
        ? 'already-done'
        : isSufficient
          ? 'done'
          : 'incomplete'

    registerCheck(checkId, baseState, balanceCheckLabel, 'balance', optional)
    return () => unregisterCheck(checkId)
  }, [registerCheck, unregisterCheck, checkId, isSufficient, balanceCheckLabel, isLoading, optional])

  const state = getDisplayState(checkId)

  const handleRecheck = () => {
    refresh()
  }

  if (state === 'already-done' || state === 'done' || isLoading !== false) {
    return null
  }

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
        {t('borrow.insufficient-balance')}{' '}
        <Typography
          component='span'
          variant='body2'
          sx={{ color: theme.palette.common.white, fontWeight: 500 }}
        >
          {formatWei(deficit, currency, {
            // Apply high precision formatting here, as deficit is important
            precision: {
              eth: { min: 0, max: 5 },
              usd: { min: 0, max: 5 },
            },
          })} {ticker}
        </Typography>{' '}
        {t('borrow.to-wallet')}
      </Typography>
      <Button
        variant='outlined'
        size='small'
        onClick={handleRecheck}
        color='error'
        sx={{
          borderRadius: 0.5,
          color: alpha(theme.palette.common.white, 0.8),
          borderColor: alpha(theme.palette.grey[500], 0.32),
          '&:hover': {
            borderColor: alpha(theme.palette.grey[500], 0.5),
            backgroundColor: alpha(theme.palette.error.main, 0.08),
          },
          '&:active': {
            borderColor: alpha(theme.palette.grey[500], 0.7),
            backgroundColor: alpha(theme.palette.error.main, 0.26),
          },
        }}
      >
        {t('borrow.recheck-balance')}
      </Button>
    </Box>
  )
}
