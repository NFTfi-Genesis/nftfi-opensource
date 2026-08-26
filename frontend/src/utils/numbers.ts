import { Percentage } from 'src/entities/base/Percentage'

export type Precision = {
  min: number
  max: number
}

export function roundToPrecision(number: number, precision: number): number {
  const sign = Math.sign(number)
  return sign * Math.round(Math.abs(number) * Math.pow(10, precision)) / Math.pow(10, precision)
}

export function getDecimalSeparatorForCurrentLocale() {
  const currentLocale = (typeof window !== 'undefined' && window?.navigator?.language) || 'en-US'
  // Just a dummy number with a group separator and a decimal separator
  const numberWithGroupAndDecimalSeparator = 1000.1
  if (!currentLocale) {
    return '.'
  }
  // If Intl is available, use the most accurate way to get the decimal separator
  if (Intl?.NumberFormat) {
    return Intl.NumberFormat(currentLocale)
      .formatToParts(numberWithGroupAndDecimalSeparator)
      // We know for sure that decimal part is present as we define the number
      .find(part => part.type === 'decimal')!.value
  }
  // If Intl is not available, use the simple method
  return numberWithGroupAndDecimalSeparator.toLocaleString().substring(1, 2)
}

export function formatNumberWithPrecision(number: number, precision: Precision): string {
  const fixedNumber = roundToPrecision(number, precision.max)
  if (number !== 0 && fixedNumber === 0) {
    if (precision.max > 0) {
      const zeroPointOne = `0.${'0'.repeat(precision.max - 1)}1`
      return `<${localizeNumber(zeroPointOne, precision)}`
    } else {
      return '<1'
    }
  } else if (number === 0) {
    const zeroPointZero = `0.${'0'.repeat(precision.max)}`
    if (precision.max > 0) {
      return `${localizeNumber(zeroPointZero, precision)}`
    } else {
      return '0'
    }
  } else {
    return localizeNumber(fixedNumber.toString(), precision)
  }
}

export function localizeNumber(numberAsString: string, precision: Precision, locale?: string): string {
  if (numberAsString.startsWith('<')) {
    return numberAsString
  }
  const currentLocale = locale || (typeof window !== 'undefined' && window?.navigator?.language) || 'en-US'
  const number = Number(numberAsString)
  if (isNaN(number)) {
    return numberAsString
  }
  return number.toLocaleString(currentLocale, {
    minimumFractionDigits: precision.min,
    maximumFractionDigits: precision.max,
  })
}

export function formatAvg(avg: number): string {
  return localizeNumber(avg.toFixed(2), { min: 2, max: 2 })
}

export function formatPercentage(percentage: Percentage, addFigureSpace: boolean = true): string {
  const formatted = formatNumberWithPrecision(percentage, { min: 2, max: 2 })
  // If integer part is one digit, add a leading figure space
  // to make all percentages aligned. Figure space has the same width as a digit.
  if (formatted.split(getDecimalSeparatorForCurrentLocale())[0].length === 1) {
    return addFigureSpace
      ? `\u2007${formatted}`
      : formatted
  }
  return formatted
}

export const isBetween = (
  value: bigint | string | number | undefined,
  min: number,
  max: number
) => {
  if (!value && value !== 0) return false
  return Number(value) >= min && Number(value) <= max
}

function int64ToBigInt({ low, high, unsigned }: { low: number, high: number, unsigned: boolean }): bigint {
  // Force to unsigned 32-bit chunks
  const lo = BigInt(low >>> 0)
  const hi = BigInt(high >>> 0)

  let value = (hi << 32n) | lo

  if (!unsigned) {
    // If signed and sign bit (bit 63) is set → negative number
    const signBit = 1n << 63n
    if (value & signBit) {
      value -= 1n << 64n
    }
  }

  return value
}

/**
 * Parses API Wei values that can be either a number or an int64 object.
 * The API returns values already in Wei, so no unit conversion is needed.
 */
export function parseApiWei(n: number | { low: number, high: number, unsigned: boolean }): bigint {
  if (typeof n === 'number') {
    // This is a workaround to avoid BigInt(n) changing the actual value
    // as on BE wei values are stored as numbers, which are > Number.MAX_SAFE_INTEGER basically always.
    // Converting it to BigInt directly would cause precision loss.
    // Example: BigInt(1000191780821917800) === 1000191780821917824n; 1000191780821917800 is approximately 1 WETH
    // More specifically, the precision loss happened earlier when wei repayment was stored as number when creating the offer.
    // TODO: Fix BE to store wei values as strings instead of numbers.
    return BigInt(String(n))
  }
  return int64ToBigInt(n)
}
