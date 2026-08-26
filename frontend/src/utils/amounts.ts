import { formatUnits, parseUnits } from 'ethers'
import merge from 'lodash/merge'
import { Amount } from 'src/entities/base/Amount'
import { Wei } from 'src/entities/base/Wei'
import { PartialRecursive } from 'src/typesUtils'
import { Currency } from 'src/entities/domain/Currency'
import {
  getCurrencyFromName,
  CurrencyDecimals,
} from 'src/utils/currencies'
import {
  formatNumberWithPrecision,
  localizeNumber,
  Precision,
  roundToPrecision,
} from 'src/utils/numbers'

export function weiToAmount(wei: Wei, currency: Currency): Amount {
  const decimals = CurrencyDecimals[currency]

  return Number(formatUnits(wei, decimals)) as Amount
}

export function amountToWei(amount: Amount, currency: Currency): Wei {
  const decimals = CurrencyDecimals[currency]

  // Round the amount to the correct number of decimals before parsing
  const roundedAmount
    = Math.round(Number(amount) * Math.pow(10, decimals)) / Math.pow(10, decimals)

  return parseUnits(roundedAmount.toString(), decimals) as Wei
}

type FormattingOptions = {
  allowCompact: boolean
  // Amount of digits which when exceeded will trigger compact formatting
  compactThreshold: number
}

type FormatAmountOptions = {
  precision: {
    eth: Precision
    usd: Precision
  }
} & FormattingOptions

const defaultPrecision: Precision = {
  min: 2,
  max: 2,
}

const defaultFormattingOptions: FormattingOptions = {
  allowCompact: true,
  compactThreshold: 15,
}

const defaultFormatAmountOptions: FormatAmountOptions = {
  precision: {
    eth: {
      min: 3,
      max: 3,
    },
    usd: {
      min: 0,
      max: 0,
    },
  },
  ...defaultFormattingOptions,
}

// Internal function to format amounts with given precision
// Don't use directly, use formatAmount instead
export function formatAmountWithPrecision(amount: Amount, precision: Precision, customOptions?: PartialRecursive<FormattingOptions>): string {
  const options = merge({}, defaultFormattingOptions, customOptions || {})
  let formattedAmount = ''

  formattedAmount = formatNumberWithPrecision(amount, precision)

  // If the output exceeds the compact threshold, pass the input to the compact formatter
  if (options.allowCompact && formattedAmount.length > options.compactThreshold) {
    return formatAmountCompact(amount)
  }

  return formattedAmount
}

/**
 * Main function to format amounts
 * Applies short formatting rules
 * Use for known currencies
 * @param amount - The amount to format
 * @param currency - The currency to format the amount in
 * @param customOptions - Custom formatting options
 * @param customOptions.precision - Custom precision options
 * @param customOptions.allowCompact - Whether to allow compact formatting
 * @param customOptions.compactThreshold - The formatted length at which to switch to compact formatting
 * @returns The formatted amount
 */
export function formatAmount(amount: Amount, currency: Currency, customOptions?: PartialRecursive<FormatAmountOptions>): string {
  const options = merge({}, defaultFormatAmountOptions, customOptions || {})

  let precision: Precision
  if (currency === Currency.USDC || currency === Currency.DAI || currency === Currency.USD) {
    precision = options.precision.usd
  } else if (currency === Currency.WETH || currency === Currency.WSTETH) {
    precision = options.precision.eth
  } else {
    precision = {
      min: 0,
      max: 0,
    }
  }

  return formatAmountWithPrecision(amount, precision, options)
}

// Applies long formatting rules
// Use for amount tooltips
export function formatAmountLong(amount: Amount, currency: Currency) {
  const formattedAmount = formatAmount(amount, currency, {
    precision: {
      eth: {
        min: 3,
        max: 6,
      },
      usd: {
        min: 0,
        max: 4,
      },
    },
    allowCompact: false,
  })
  return formattedAmount
}

// Applies default formatting options
// Use for unknown currencies
export function formatAmountDefault(amount: Amount, options?: PartialRecursive<FormattingOptions>): string {
  return formatAmountWithPrecision(amount, defaultPrecision, options)
}

// Tries to figure out the currency from the currency name
// If no currency is found, it falls back to the default formatter
// Use only for external data sources (e.g. Reservoir)
// that can provide amounts in currencies that are not supported
export function formatAmountByCurrencyName(amount: Amount, currencyName: string, options?: PartialRecursive<FormatAmountOptions>): string {
  const currency = getCurrencyFromName(currencyName)
  if (!currency) {
    return formatAmountDefault(amount, options)
  }

  return formatAmount(amount, currency, options)
}

export function formatWei(weiAmount: Wei, currency: Currency, customOptions?: PartialRecursive<FormatAmountOptions>) {
  const amount = weiToAmount(weiAmount, currency)
  return formatAmount(amount, currency, customOptions)
}

export function formatWeiLong(weiAmount: Wei, currency: Currency) {
  const amount = weiToAmount(weiAmount, currency)
  return formatAmountLong(amount, currency)
}

// Decimals configuration for compact formatting
const kDecimals = 0
const mDecimals = 2
const bDecimals = 2
const tDecimals = 2

// Internal function to format amounts in compact format
// Don't use directly, use formatAmount instead
// Formats amount to format like 1.38k, 1.34M, 1.34B, 1.34T
export function formatAmountCompact(
  amount: Amount,
): string {
  const absValue = Math.abs(amount)
  const sign = amount < 0
    ? '-'
    : ''

  let compactAmount = ''
  let suffix = ''
  let precision = 0

  // If the value is less than 1000, use the value without a suffix
  if (absValue < 1000) {
    compactAmount = absValue.toString()
    precision = 0
    suffix = ''
  } else if (absValue < 1_000_000) {
    compactAmount = roundToPrecision(absValue / 1000, kDecimals).toString()
    suffix = 'k'
    precision = kDecimals
  } else if (absValue < 1_000_000_000) {
    compactAmount = roundToPrecision(absValue / 1_000_000, mDecimals).toString()
    suffix = 'm'
    precision = mDecimals
  } else if (absValue < 1_000_000_000_000) {
    compactAmount = roundToPrecision(absValue / 1_000_000_000, bDecimals).toString()
    suffix = 'B'
    precision = bDecimals
  } else {
    compactAmount = roundToPrecision(absValue / 1_000_000_000_000, tDecimals).toString()
    suffix = 'T'
    precision = tDecimals
  }

  // Check for threshold values that should round up to the next unit
  if (absValue >= 999_500 && absValue < 1_000_000) {
    compactAmount = '1'
    suffix = 'm'
    precision = mDecimals
  } else if (absValue >= 999_500_000 && absValue < 1_000_000_000) {
    compactAmount = '1'
    suffix = 'B'
    precision = bDecimals
  } else if (absValue >= 999_500_000_000 && absValue < 1_000_000_000_000) {
    compactAmount = '1'
    suffix = 'T'
    precision = tDecimals
  }

  return `${sign}${localizeNumber(compactAmount, { min: 0, max: precision })}${suffix}`
}

export function convertAmountToUsd(currency: Currency, amount: number, fxRate: number): number {
  if (currency === Currency.WETH || currency === Currency.WSTETH) {
    return amount * fxRate
  }
  return amount
}

export function convertWeiToUsd(currency: Currency, wei: Wei, fxRate: number): number {
  return convertAmountToUsd(currency, weiToAmount(wei, currency), fxRate)
}
