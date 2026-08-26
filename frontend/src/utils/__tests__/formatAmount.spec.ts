import { describe, it, expect } from 'vitest'
import { formatAmount, formatAmountLong } from 'src/utils/amounts'
import { Currency } from 'src/entities/domain/Currency'
import { Amount } from 'src/entities/base/Amount'

describe('formatAmount specification based tests', () => {
  describe('USD (stablecoins)', () => {
    it('should format exact zero as "0"', () => {
      expect(formatAmount(0 as Amount, Currency.USDC)).toBe('0')
      expect(formatAmountLong(0 as Amount, Currency.USDC)).toBe('0')
    })

    it('should format small nonzero (0.0005) as "<1"', () => {
      expect(formatAmount(0.0005 as Amount, Currency.USDC)).toBe('<1')
      expect(formatAmountLong(0.0005 as Amount, Currency.USDC)).toBe('0.0005')
    })

    it('should format 0.00049 as "<1" due to rounding to zero', () => {
      expect(formatAmount(0.00049 as Amount, Currency.USDC)).toBe('<1')
      expect(formatAmountLong(0.00049 as Amount, Currency.USDC)).toBe('0.0005')
    })

    it('should format 0.0004999 as "<1" due to rounding to zero', () => {
      expect(formatAmount(0.0004999 as Amount, Currency.USDC)).toBe('<1')
      expect(formatAmountLong(0.0004999 as Amount, Currency.USDC)).toBe('0.0005')
    })

    it('should format 0.0001234 as "<1" due to rounding to zero', () => {
      expect(formatAmount(0.0001234 as Amount, Currency.USDC)).toBe('<1')
      expect(formatAmountLong(0.0001234 as Amount, Currency.USDC)).toBe('0.0001')
    })

    it('should format whole number 1 as "1"', () => {
      expect(formatAmount(1 as Amount, Currency.USDC)).toBe('1')
      expect(formatAmountLong(1 as Amount, Currency.USDC)).toBe('1')
    })

    it('should format 1.2345 as "1" due to no round-up needed', () => {
      expect(formatAmount(1.2345 as Amount, Currency.USDC)).toBe('1')
      expect(formatAmountLong(1.2345 as Amount, Currency.USDC)).toBe('1.2345')
    })

    it('should format 1.9999 as "2" due to rounding up', () => {
      expect(formatAmount(1.9999 as Amount, Currency.USDC)).toBe('2')
      expect(formatAmountLong(1.9999 as Amount, Currency.USDC)).toBe('1.9999')
    })

    it('should format 12345.6789 as "12,346" due to rounding up', () => {
      expect(formatAmount(12345.6789 as Amount, Currency.USDC)).toBe('12,346')
      expect(formatAmountLong(12345.6789 as Amount, Currency.USDC)).toBe('12,345.6789')
    })

    it('should format 100000 as "100,000" or "100k" in compact mode', () => {
      expect(formatAmount(100000 as Amount, Currency.USDC)).toBe('100,000')
      expect(formatAmount(100000 as Amount, Currency.USDC, { compactThreshold: 5 })).toBe('100k')
      expect(formatAmountLong(100000 as Amount, Currency.USDC)).toBe('100,000')
    })

    it('should format 100000.9999 as "100,001" or "100k" in compact mode', () => {
      expect(formatAmount(100000.9999 as Amount, Currency.USDC)).toBe('100,001')
      expect(formatAmount(100000.9999 as Amount, Currency.USDC, { compactThreshold: 5 })).toBe('100k')
      expect(formatAmountLong(100000.9999 as Amount, Currency.USDC)).toBe('100,000.9999')
    })

    it('should format 999999.9999 as "1,000,000" due to rounding up', () => {
      expect(formatAmount(999999.9999 as Amount, Currency.USDC)).toBe('1,000,000')
      expect(formatAmountLong(999999.9999 as Amount, Currency.USDC)).toBe('999,999.9999')
    })

    it('should format 1000000 as "1,000,000" or "1m" in compact mode', () => {
      expect(formatAmount(1000000 as Amount, Currency.USDC)).toBe('1,000,000')
      expect(formatAmount(1000000 as Amount, Currency.USDC, { compactThreshold: 5 })).toBe('1m')
      expect(formatAmountLong(1000000 as Amount, Currency.USDC)).toBe('1,000,000')
    })

    it('should format 1234567.9999 with appropriate rounding and compact mode', () => {
      expect(formatAmount(1234567.9999 as Amount, Currency.USDC)).toBe('1,234,568')
      expect(formatAmount(1234567.9999 as Amount, Currency.USDC, { compactThreshold: 5 })).toBe('1.23m')
      expect(formatAmountLong(1234567.9999 as Amount, Currency.USDC)).toBe('1,234,567.9999')
    })
  })

  describe('ETH/wETH', () => {
    it('should format exact zero with three decimals', () => {
      expect(formatAmount(0 as Amount, Currency.WETH)).toBe('0.000')
      expect(formatAmountLong(0 as Amount, Currency.WETH)).toBe('0.000')
    })

    it('should format 0.0005 as "0.001" due to rounding up', () => {
      expect(formatAmount(0.0005 as Amount, Currency.WETH)).toBe('0.001')
      expect(formatAmountLong(0.0005 as Amount, Currency.WETH)).toBe('0.0005')
    })

    it('should format 0.00049 as "<0.001" due to rounding to zero', () => {
      expect(formatAmount(0.00049 as Amount, Currency.WETH)).toBe('<0.001')
      expect(formatAmountLong(0.00049 as Amount, Currency.WETH)).toBe('0.00049')
    })

    it('should format 0.0004999 as "<0.001" due to rounding to zero', () => {
      expect(formatAmount(0.0004999 as Amount, Currency.WETH)).toBe('<0.001')
      expect(formatAmountLong(0.0004999 as Amount, Currency.WETH)).toBe('0.0005')
    })

    it('should format 0.0001234 as "<0.001" due to rounding to zero', () => {
      expect(formatAmount(0.0001234 as Amount, Currency.WETH)).toBe('<0.001')
      expect(formatAmountLong(0.0001234 as Amount, Currency.WETH)).toBe('0.000123')
    })

    it('should format whole number 1 with three decimals', () => {
      expect(formatAmount(1 as Amount, Currency.WETH)).toBe('1.000')
      expect(formatAmountLong(1 as Amount, Currency.WETH)).toBe('1.000')
    })

    it('should format 1.2345 as "1.235" due to rounding up', () => {
      expect(formatAmount(1.2345 as Amount, Currency.WETH)).toBe('1.235')
      expect(formatAmountLong(1.2345 as Amount, Currency.WETH)).toBe('1.2345')
    })

    it('should format 1.9999 as "2.000" due to rounding up', () => {
      expect(formatAmount(1.9999 as Amount, Currency.WETH)).toBe('2.000')
      expect(formatAmountLong(1.9999 as Amount, Currency.WETH)).toBe('1.9999')
    })

    it('should format 12345.6789 with three decimal places', () => {
      expect(formatAmount(12345.6789 as Amount, Currency.WETH)).toBe('12,345.679')
      expect(formatAmountLong(12345.6789 as Amount, Currency.WETH)).toBe('12,345.6789')
    })

    it('should format 100000 with three decimals or "100k" in compact mode', () => {
      expect(formatAmount(100000 as Amount, Currency.WETH)).toBe('100,000.000')
      expect(formatAmount(100000 as Amount, Currency.WETH, { compactThreshold: 5 })).toBe('100k')
      expect(formatAmountLong(100000 as Amount, Currency.WETH)).toBe('100,000.000')
    })

    it('should format 100000.9999 with appropriate rounding', () => {
      expect(formatAmount(100000.9999 as Amount, Currency.WETH)).toBe('100,001.000')
      expect(formatAmount(100000.9999 as Amount, Currency.WETH, { compactThreshold: 5 })).toBe('100k')
      expect(formatAmountLong(100000.9999 as Amount, Currency.WETH)).toBe('100,000.9999')
    })

    it('should format 999999.9999 as "1,000,000.000" due to rounding up', () => {
      expect(formatAmount(999999.9999 as Amount, Currency.WETH)).toBe('1,000,000.000')
      expect(formatAmountLong(999999.9999 as Amount, Currency.WETH)).toBe('999,999.9999')
    })

    it('should format 1000000 with three decimals or "1m" in compact mode', () => {
      expect(formatAmount(1000000 as Amount, Currency.WETH)).toBe('1,000,000.000')
      expect(formatAmount(1000000 as Amount, Currency.WETH, { compactThreshold: 5 })).toBe('1m')
      expect(formatAmountLong(1000000 as Amount, Currency.WETH)).toBe('1,000,000.000')
    })

    it('should format very small number 0.0000004 as "<0.001"', () => {
      expect(formatAmount(0.0000004 as Amount, Currency.WETH)).toBe('<0.001')
      expect(formatAmountLong(0.0000004 as Amount, Currency.WETH)).toBe('<0.000001')
    })

    it('should format 0.0000065 as "<0.001" with appropriate tooltip', () => {
      expect(formatAmount(0.0000065 as Amount, Currency.WETH)).toBe('<0.001')
      expect(formatAmountLong(0.0000065 as Amount, Currency.WETH)).toBe('0.000007')
    })

    it('should format 0.1234567 with three decimals and six in tooltip', () => {
      expect(formatAmount(0.1234567 as Amount, Currency.WETH)).toBe('0.123')
      expect(formatAmountLong(0.1234567 as Amount, Currency.WETH)).toBe('0.123457')
    })
  })
})
