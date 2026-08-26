import { describe, it, expect } from 'vitest'
import {
  formatAmountCompact,
  formatAmount,
  weiToAmount,
  amountToWei,
  formatWei,
  formatWeiLong,
  formatAmountLong,
  formatAmountDefault,
  formatAmountByCurrencyName,
} from 'src/utils/amounts'
import { Currency } from 'src/entities/domain/Currency'
import { Wei } from 'src/entities/base/Wei'
import { Amount } from 'src/entities/base/Amount'

describe('amountsFormatting utils', () => {
  describe('weiToAmount', () => {
    it('should convert wei to amount for different currencies', () => {
      // USDC has 6 decimals
      expect(weiToAmount(1_000_000n as Wei, Currency.USDC)).toBe(1 as Amount)
      expect(weiToAmount(1_234_567n as Wei, Currency.USDC)).toBe(1.234567 as Amount)

      // WETH has 18 decimals
      expect(weiToAmount(1_000_000_000_000_000_000n as Wei, Currency.WETH)).toBe(1 as Amount)
      expect(weiToAmount(1_234_567_000_000_000_000n as Wei, Currency.WETH)).toBe(1.234567 as Amount)
    })

    it('should handle zero wei', () => {
      expect(weiToAmount(0n as Wei, Currency.USDC)).toBe(0 as Amount)
      expect(weiToAmount(0n as Wei, Currency.WETH)).toBe(0 as Amount)
    })
  })

  describe('amountToWei', () => {
    it('should convert amount to wei for different currencies', () => {
      // USDC has 6 decimals
      expect(amountToWei(1 as Amount, Currency.USDC)).toBe(1_000_000n as Wei)
      expect(amountToWei(1.234567 as Amount, Currency.USDC)).toBe(1_234_567n as Wei)

      // WETH has 18 decimals
      expect(amountToWei(1 as Amount, Currency.WETH)).toBe(1_000_000_000_000_000_000n as Wei)
      expect(amountToWei(1.234567 as Amount, Currency.WETH)).toBe(1_234_567_000_000_000_000n as Wei)
    })

    it('should handle zero amount', () => {
      expect(amountToWei(0 as Amount, Currency.USDC)).toBe(0n as Wei)
      expect(amountToWei(0 as Amount, Currency.WETH)).toBe(0n as Wei)
    })

    it('should round amounts to correct decimals before converting', () => {
      // USDC with 6 decimals should round to 6 decimal places
      expect(amountToWei(1.2345678 as Amount, Currency.USDC)).toBe(1_234_568n as Wei) // Rounds up
      expect(amountToWei(1.2345674 as Amount, Currency.USDC)).toBe(1_234_567n as Wei) // Rounds down
    })
  })

  describe('formatAmount', () => {
    it('should format USDC amount with default precision', () => {
      expect(formatAmount(123.456 as Amount, Currency.USDC)).toBe('123')
    })

    it('should format DAI amount with default precision', () => {
      expect(formatAmount(456.789 as Amount, Currency.DAI)).toBe('457')
    })

    it('should format WETH amount with default precision', () => {
      expect(formatAmount(1.23456 as Amount, Currency.WETH)).toBe('1.235')
    })

    it('should format WSTETH amount with default precision', () => {
      expect(formatAmount(2.34567 as Amount, Currency.WSTETH)).toBe('2.346')
    })

    it('should format amount with custom precision options', () => {
      expect(formatAmount(123.456 as Amount, Currency.USDC, { precision: { usd: { min: 2, max: 2 } } })).toBe('123.46')
    })

    it('should format large amount with compact formatting when exceeding threshold', () => {
      expect(formatAmount(12_345_678 as Amount, Currency.USDC, { compactThreshold: 5 })).toBe('12.35m')
    })

    it('should format zero amount correctly for different currencies', () => {
      expect(formatAmount(0 as Amount, Currency.USDC)).toBe('0')
      expect(formatAmount(0 as Amount, Currency.WETH)).toBe('0.000')
    })

    it('should format negative amounts correctly', () => {
      expect(formatAmount(-123.456 as Amount, Currency.USDC)).toBe('-123')
      expect(formatAmount(-123.456 as Amount, Currency.WETH)).toBe('-123.456')
    })

    it('should format very small amounts with special notation', () => {
      expect(formatAmount(0.0000001 as Amount, Currency.USDC)).toBe('<1')
      expect(formatAmount(0.0000001 as Amount, Currency.WETH)).toBe('<0.001')
    })

    it('should format correctly with empty or undefined options', () => {
      expect(formatAmount(123.456 as Amount, Currency.WETH, {})).toBe('123.456')
      expect(formatAmount(123.456 as Amount, Currency.WETH, undefined)).toBe('123.456')
    })

    it('should format correctly with partial options object', () => {
      expect(formatAmount(123.456 as Amount, Currency.USDC, { allowCompact: false })).toBe('123')
    })

    it('should format extremely large numbers with compact notation', () => {
      expect(formatAmount(1234567890123 as Amount, Currency.USDC)).toBe('1.23T')
    })

    it('should format DAI amount with custom precision options', () => {
      expect(formatAmount(123.456 as Amount, Currency.DAI, { precision: { usd: { min: 2, max: 2 } } })).toBe('123.46')
    })

    it('should format amount with thousand separators', () => {
      expect(formatAmount(1234 as Amount, Currency.USDC)).toBe('1,234')
      expect(formatAmount(1000000 as Amount, Currency.USDC)).toBe('1,000,000')
      expect(formatAmount(1234567 as Amount, Currency.USDC)).toBe('1,234,567')
    })

    it('should handle thousand separators with decimals', () => {
      expect(formatAmount(1234.56 as Amount, Currency.WETH)).toBe('1,234.560')
      expect(formatAmount(1000000.123 as Amount, Currency.WETH)).toBe('1,000,000.123')
      expect(formatAmount(1234567.89 as Amount, Currency.WETH, { precision: { eth: { min: 2, max: 2 } } })).toBe('1,234,567.89')
    })

    it('should handle negative numbers with thousand separators', () => {
      expect(formatAmount(-1234 as Amount, Currency.USDC)).toBe('-1,234')
      expect(formatAmount(-1000000.123 as Amount, Currency.WETH)).toBe('-1,000,000.123')
    })

    it('should handle small numbers without thousand separators', () => {
      expect(formatAmount(123 as Amount, Currency.USDC)).toBe('123')
      expect(formatAmount(123.456 as Amount, Currency.WETH)).toBe('123.456')
    })

    it('should handle zero and special notations without separators', () => {
      expect(formatAmount(0 as Amount, Currency.USDC)).toBe('0')
      expect(formatAmount(0.0000001 as Amount, Currency.WETH)).toBe('<0.001')
    })

    it('should handle custom precision with thousand separators', () => {
      expect(formatAmount(1234567.89 as Amount, Currency.USDC, { precision: { usd: { min: 2, max: 2 } } })).toBe('1,234,567.89')
      expect(formatAmount(1234567.89 as Amount, Currency.WETH, { precision: { eth: { min: 4, max: 4 } } })).toBe('1,234,567.8900')
    })

    it('should not add separators when using compact notation', () => {
      expect(formatAmount(1234567 as Amount, Currency.USDC, { compactThreshold: 5 })).toBe('1.23m')
      expect(formatAmount(1234567890 as Amount, Currency.USDC, { compactThreshold: 5 })).toBe('1.23B')
    })
  })

  describe('formatAmountCompact', () => {
    it('should format thousands with k suffix', () => {
      expect(formatAmountCompact(1_000 as Amount)).toBe('1k')
      expect(formatAmountCompact(1_234 as Amount)).toBe('1k')
      expect(formatAmountCompact(5_678.9 as Amount)).toBe('6k')
      expect(formatAmountCompact(10_000 as Amount)).toBe('10k')
      expect(formatAmountCompact(999_499 as Amount)).toBe('999k')
      expect(formatAmountCompact(999_500 as Amount)).toBe('1m')
      expect(formatAmountCompact(999_999 as Amount)).toBe('1m')
    })

    it('should format millions with M suffix', () => {
      expect(formatAmountCompact(1_000_000 as Amount)).toBe('1m')
      expect(formatAmountCompact(5_390_000 as Amount)).toBe('5.39m')
      expect(formatAmountCompact(12_345_678 as Amount)).toBe('12.35m')
      expect(formatAmountCompact(999_499_999 as Amount)).toBe('999.5m')
      expect(formatAmountCompact(999_500_000 as Amount)).toBe('1B')
      expect(formatAmountCompact(999_999_999 as Amount)).toBe('1B')
    })

    it('should format billions with B suffix', () => {
      expect(formatAmountCompact(1_000_000_000 as Amount)).toBe('1B')
      expect(formatAmountCompact(1_234_567_890 as Amount)).toBe('1.23B')
      expect(formatAmountCompact(987_654_321_000 as Amount)).toBe('987.65B')
      expect(formatAmountCompact(999_499_999_999 as Amount)).toBe('999.5B')
      expect(formatAmountCompact(999_500_000_000 as Amount)).toBe('1T')
      expect(formatAmountCompact(999_999_999_999 as Amount)).toBe('1T')
    })

    it('should format trillions with T suffix', () => {
      expect(formatAmountCompact(1_000_000_000_000 as Amount)).toBe('1T')
      expect(formatAmountCompact(1_234_567_890_123 as Amount)).toBe('1.23T')
    })

    it('should handle negative numbers', () => {
      expect(formatAmountCompact(-1_234 as Amount)).toBe('-1k')
      expect(formatAmountCompact(-5_390_000 as Amount)).toBe('-5.39m')
    })

    it('should format numbers less than 1000 without suffix', () => {
      expect(formatAmountCompact(0 as Amount)).toBe('0')
      expect(formatAmountCompact(123 as Amount)).toBe('123')
      expect(formatAmountCompact(999 as Amount)).toBe('999')
    })
  })

  describe('formatAmountLong', () => {
    it('should format with higher precision', () => {
      expect(formatAmountLong(1.23456789 as Amount, Currency.WETH)).toBe('1.234568')
      expect(formatAmountLong(1.23456789 as Amount, Currency.USDC)).toBe('1.2346')
    })

    it('should never use compact notation', () => {
      expect(formatAmountLong(1234567.89 as Amount, Currency.WETH)).toBe('1,234,567.890')
      expect(formatAmountLong(1234567.89 as Amount, Currency.USDC)).toBe('1,234,567.89')
    })

    it('should handle zero and very small values', () => {
      expect(formatAmountLong(0 as Amount, Currency.WETH)).toBe('0.000')
      expect(formatAmountLong(0.000000001 as Amount, Currency.WETH)).toBe('<0.000001')
    })
  })

  describe('formatWei', () => {
    it('should format wei amounts correctly', () => {
      expect(formatWei(1_000_000n as Wei, Currency.USDC)).toBe('1')
      expect(formatWei(1_234_567n as Wei, Currency.USDC)).toBe('1')
      expect(formatWei(1_000_000_000_000_000_000n as Wei, Currency.WETH)).toBe('1.000')
    })

    it('should handle zero wei', () => {
      expect(formatWei(0n as Wei, Currency.USDC)).toBe('0')
      expect(formatWei(0n as Wei, Currency.WETH)).toBe('0.000')
    })
  })

  describe('formatWeiLong', () => {
    it('should format wei amounts with higher precision', () => {
      expect(formatWeiLong(1_234_567n as Wei, Currency.USDC)).toBe('1.2346')
      expect(formatWeiLong(1_234_567_000_000_000_000n as Wei, Currency.WETH)).toBe('1.234567')
    })

    it('should handle zero wei', () => {
      expect(formatWeiLong(0n as Wei, Currency.USDC)).toBe('0')
      expect(formatWeiLong(0n as Wei, Currency.WETH)).toBe('0.000')
    })
  })

  describe('formatAmountDefault', () => {
    it('should format with default precision (2 decimal places)', () => {
      expect(formatAmountDefault(123.456 as Amount)).toBe('123.46')
      expect(formatAmountDefault(123.45 as Amount)).toBe('123.45')
      expect(formatAmountDefault(123.4 as Amount)).toBe('123.40')
    })

    it('should handle zero and negative numbers', () => {
      expect(formatAmountDefault(0 as Amount)).toBe('0.00')
      expect(formatAmountDefault(-123.456 as Amount)).toBe('-123.46')
    })

    it('should respect custom formatting options', () => {
      expect(formatAmountDefault(123456.789 as Amount, { allowCompact: true, compactThreshold: 5 })).toBe('123k')
      expect(formatAmountDefault(123456.789 as Amount, { allowCompact: false })).toBe('123,456.79')
    })

    it('should add thousand separators', () => {
      expect(formatAmountDefault(1234.56 as Amount)).toBe('1,234.56')
      expect(formatAmountDefault(1000000.12 as Amount)).toBe('1,000,000.12')
    })

    it('should handle very small numbers', () => {
      expect(formatAmountDefault(0.001234 as Amount)).toBe('<0.01')
      expect(formatAmountDefault(0.00999 as Amount)).toBe('0.01')
    })
  })

  describe('formatAmountWithCurrencyName', () => {
    it('should format known currencies using their specific rules', () => {
      expect(formatAmountByCurrencyName(123.456 as Amount, 'USDC')).toBe('123')
      expect(formatAmountByCurrencyName(123.456 as Amount, 'WETH')).toBe('123.456')
      expect(formatAmountByCurrencyName(123.456 as Amount, 'DAI')).toBe('123')
      expect(formatAmountByCurrencyName(123.456 as Amount, 'WSTETH')).toBe('123.456')
    })

    it('should handle case variations in currency names', () => {
      expect(formatAmountByCurrencyName(123.456 as Amount, 'usdc')).toBe('123')
      expect(formatAmountByCurrencyName(123.456 as Amount, 'Weth')).toBe('123.456')
      expect(formatAmountByCurrencyName(123.456 as Amount, 'dai')).toBe('123')
    })

    it('should fallback to default formatting for unknown currencies', () => {
      expect(formatAmountByCurrencyName(123.456 as Amount, 'UNKNOWN')).toBe('123.46')
      expect(formatAmountByCurrencyName(123.456 as Amount, '')).toBe('123.46')
      expect(formatAmountByCurrencyName(123.456 as Amount, 'BTC')).toBe('123.46')
    })

    it('should respect formatting options for both known and unknown currencies', () => {
      // Known currency with options
      expect(formatAmountByCurrencyName(123456.789 as Amount, 'USDC', { allowCompact: true, compactThreshold: 5 })).toBe('123k')

      // Unknown currency with options
      expect(formatAmountByCurrencyName(123456.789 as Amount, 'UNKNOWN', { allowCompact: true, compactThreshold: 5 })).toBe('123k')
    })

    it('should handle zero and negative values', () => {
      expect(formatAmountByCurrencyName(0 as Amount, 'USDC')).toBe('0')
      expect(formatAmountByCurrencyName(-123.456 as Amount, 'WETH')).toBe('-123.456')
      expect(formatAmountByCurrencyName(0 as Amount, 'UNKNOWN')).toBe('0.00')
    })
  })
})
