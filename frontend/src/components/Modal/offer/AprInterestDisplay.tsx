import { Stack, Typography, Tooltip, IconButton } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { Iconify } from 'src/components/Iconify'
import { Currency } from 'src/entities/domain/Currency'
import { Amount } from 'src/entities/base/Amount'
import { Wei } from 'src/entities/base/Wei'
import { Seconds } from 'src/entities/base/Seconds'
import { Percentage } from 'src/entities/base/Percentage'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { calculateMinEffectiveApr, calculateMaxInterestAtTerm } from 'src/utils/terms'
import { amountToWei, formatWei } from 'src/utils/amounts'
import { formatPercentage } from 'src/utils/numbers'
import { getCurrencyTicker } from 'src/utils/currencies'
import { PanicError } from 'src/errors/PanicError'

type AprInterestDisplayProps = {
  principal: string
  apr: string
  duration: number
  originationFee: string
  currency: Currency
  isFlexible: boolean
}

export function AprInterestDisplay({
  principal,
  apr,
  duration,
  originationFee,
  currency,
  isFlexible,
}: AprInterestDisplayProps) {
  const { t } = useTranslation()
  const theme = useTheme()

  // TODO: instead of checking valid format by hand, lets call zod validaton smth like: makeOfferSchema.parse(data)
  const principalNum = principal
    ? Number.parseFloat(String(principal).replace(',', '.'))
    : 0
  const aprNum = apr
    ? Number.parseInt(String(apr), 10)
    : 0
  const durationNum = typeof duration === 'number'
    ? duration
    : 0
  const originationFeeNum = originationFee
    ? Number.parseFloat(String(originationFee).replace(',', '.'))
    : 0

  const hasValidInputs = principalNum > 0 && aprNum > 0 && durationNum > 0
  let minEffectiveApr: Percentage = 0 as Percentage
  let maxInterest: Wei = 0n as Wei
  let maxRepayment: Wei = 0n as Wei

  if (hasValidInputs) {
    try {
      const interestRate = (aprNum / 100) * (durationNum / 365)
      const repaymentAmount = principalNum * (1 + interestRate)

      const principalWei = amountToWei(principalNum as Amount, currency)
      const repaymentWei = amountToWei(repaymentAmount as Amount, currency)
      const originationFeeWei = originationFeeNum > 0
        ? amountToWei(originationFeeNum as Amount, currency)
        : (0n as Wei)
      const durationSeconds = (durationNum * 24 * 60 * 60) as Seconds

      minEffectiveApr = calculateMinEffectiveApr({
        terms: {
          principal: principalWei,
          repayment: repaymentWei,
          origination: originationFeeWei,
          duration: durationSeconds,
        },
      })

      maxInterest = calculateMaxInterestAtTerm({
        terms: {
          principal: principalWei,
          repayment: repaymentWei,
        },
      })

      maxRepayment = (principalWei + maxInterest) as Wei
    } catch (error) {
      throw new PanicError({
        message: 'Failed to calculate APR, max interest, and max repayment',
        details: {
          principal: principalNum,
          apr: aprNum,
          duration: durationNum,
          originationFee: originationFeeNum,
          currency,
          interestRate: (aprNum / 100) * (durationNum / 365),
          repaymentAmount: principalNum * (1 + (aprNum / 100) * (durationNum / 365)),
          originalError: error,
        },
      })
    }
  }

  return (
    <Stack
      sx={{
        backgroundColor: theme.palette.customPallette.nftfi.pageBackground,
        borderRadius: 1,
        px: 2,
        py: 1,
        gap: 1,
        gridColumn: 'span 2',
        flexDirection: 'row',
        justifyContent: 'space-between',
      }}
    >
      <Stack spacing={1} justifyContent='flex-end'>
        <Stack direction='row' alignItems='center' gap={0.5}>
          <Typography
            variant='caption'
            color='text.secondary'
            fontWeight={600}
            sx={{ lineHeight: '12px', fontFamily: theme.typography.fontFamily }}
          >
            {isFlexible
              ? t('lend.min-effective-apr')
              : t('lend.effective-apr')}
          </Typography>
          <Tooltip title={t('lend.min-effective-apr')}>
            <IconButton size='small' sx={{ p: 0, width: 12, height: 12 }}>
              <Iconify icon='ph:info' width={12} sx={{ color: 'text.secondary' }} />
            </IconButton>
          </Tooltip>
        </Stack>
        <Typography variant='body2' fontWeight={700} color='text.secondary'>
          {formatPercentage(minEffectiveApr)}%
        </Typography>
      </Stack>
      <Stack spacing={1} justifyContent='flex-end'>
        <Typography
          variant='caption'
          color='text.secondary'
          fontWeight={600}
          sx={{ lineHeight: '12px', fontFamily: theme.typography.fontFamily }}
        >
          {t(`lend.${isFlexible
            ? 'max-accrued-interest'
            : 'accrued-interest'}` as Parameters<ReturnType<typeof useTranslation>['t']>[0])}
        </Typography>
        <Stack direction='row' alignItems='center' gap={1}>
          <Typography variant='body2' fontWeight={700} color='text.secondary'>
            {getCurrencyTicker(currency)} {formatWei(maxInterest, currency)}
          </Typography>
        </Stack>
      </Stack>
      <Stack spacing={1}>
        <Typography
          variant='caption'
          color='text.secondary'
          fontWeight={600}
          sx={{ lineHeight: '12px', fontFamily: theme.typography.fontFamily }}
        >
          {t(`lend.${isFlexible
            ? 'max-repayment'
            : 'repayment'}` as Parameters<ReturnType<typeof useTranslation>['t']>[0])}
        </Typography>
        <Typography
          variant='caption'
          color='grey.600'
          fontWeight={600}
          sx={{ lineHeight: '12px', fontFamily: theme.typography.fontFamily }}
        >
          {t(`lend.${isFlexible
            ? 'principa-plus-max-interest'
            : 'principa-plus-interest'}` as Parameters<ReturnType<typeof useTranslation>['t']>[0])}
        </Typography>
        <Stack direction='row' alignItems='center' gap={1}>
          <Typography variant='body2' fontWeight={700} color='text.secondary'>
            {getCurrencyTicker(currency)} {formatWei(maxRepayment, currency)}
          </Typography>
        </Stack>
      </Stack>
    </Stack>
  )
}
