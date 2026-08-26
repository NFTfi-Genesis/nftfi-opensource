import { memo } from 'react'
import { Tooltip, TooltipProps, Typography } from '@mui/material'
import {
  formatAmount,
  formatAmountLong,
  formatWei,
  formatWeiLong,
} from 'src/utils/amounts'
import { Amount } from 'src/entities/base/Amount'
import { Wei } from 'src/entities/base/Wei'
import { Currency } from 'src/entities/domain/Currency'
import { getRawValue } from 'src/utils/testing'

// TODO: Find a better way to configure the tooltip
export type AmountDisplayTooltipProps = {
  amountTooltip?: {
    placement?: TooltipProps['placement']
    offset?: [number, number]
  }
}

export type AmountDisplayProps = (
  { currency: Currency | null, weiAmount: Wei }
  | { currency: Currency | null, amount: Amount }
) & AmountDisplayTooltipProps

export const AmountDisplay = memo(function AmountDisplay(
  props: AmountDisplayProps
) {
  let formattedAmount = ''
  let formattedFullAmount = ''

  const { currency, amountTooltip } = props
  const weiAmount = 'weiAmount' in props
    ? props.weiAmount
    : undefined
  const amount = 'amount' in props
    ? props.amount
    : undefined

  if (!currency) {
    // TODO: instead of reporting to Sentry, invalid currency should be handled by fetcher with PanicError
    // TODO: Report to Sentry
    return null
  }

  if (amount || amount === 0) {
    formattedAmount = formatAmount(amount, currency)
    formattedFullAmount = formatAmountLong(amount, currency)
  }

  if (weiAmount || weiAmount === 0n) {
    formattedAmount = formatWei(weiAmount, currency)
    formattedFullAmount = formatWeiLong(weiAmount, currency)
  }

  let rawValue: string | number | undefined = undefined
  if (typeof amount === 'bigint') {
    rawValue = (amount as bigint).toString()
  } else if (typeof weiAmount === 'bigint') {
    rawValue = (weiAmount as bigint).toString()
  } else {
    rawValue = amount ?? weiAmount
  }

  return (
    <Tooltip
      title={formattedFullAmount}
      placement={amountTooltip?.placement ?? 'top'}
      slotProps={{
        popper: {
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: amountTooltip?.offset ?? [40, -18],
              },
            },
          ],
        },
      }}
    >
      <Typography variant='mono1' {...getRawValue(rawValue)}>{formattedAmount}</Typography>
    </Tooltip>
  )
})
