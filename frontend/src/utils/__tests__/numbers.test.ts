import { describe, it, expect } from 'vitest'
import { Percentage } from 'src/entities/base/Percentage'
import {
  localizeNumber,
  formatAvg,
  formatPercentage,
  roundToPrecision,
  getDecimalSeparatorForCurrentLocale,
} from '../numbers'

describe('numbersFormatting utils', () => {
  describe('roundToPrecision', () => {
    it('should round numbers up correctly', () => {
      expect(roundToPrecision(123.456, 2)).toBe(123.46)
      expect(roundToPrecision(1.999, 2)).toBe(2.0)
    })

    it('should round numbers down correctly', () => {
      expect(roundToPrecision(123.454, 2)).toBe(123.45)
      expect(roundToPrecision(1.001, 2)).toBe(1.0)
    })

    it('should round to zero decimal places (integer)', () => {
      expect(roundToPrecision(123.456, 0)).toBe(123)
      expect(roundToPrecision(123.5, 0)).toBe(124)
    })

    it('should handle negative numbers', () => {
      expect(roundToPrecision(-123.456, 2)).toBe(-123.46)
      expect(roundToPrecision(-123.454, 2)).toBe(-123.45)
      expect(roundToPrecision(-123.5, 0)).toBe(-124)
    })

    it('should round with higher precision', () => {
      expect(roundToPrecision(1.2345678, 5)).toBe(1.23457)
      expect(roundToPrecision(1.2345678, 6)).toBe(1.234568)
    })

    it('should handle numbers that are already precise', () => {
      expect(roundToPrecision(123.45, 2)).toBe(123.45)
      expect(roundToPrecision(123, 0)).toBe(123)
    })
  })

  describe('getDecimalSeparatorForCurrentLocale', () => {
    // Note: These tests assume the testing environment's default locale or Intl support.
    // Results might vary slightly in different environments.

    it('should return a string', () => {
      expect(typeof getDecimalSeparatorForCurrentLocale()).toBe('string')
    })

    it('should return a single character', () => {
      expect(getDecimalSeparatorForCurrentLocale().length).toBe(1)
    })

    it('should likely return "." for default/en-US locale', () => {
      // This is the most common default in JS environments
      expect(getDecimalSeparatorForCurrentLocale()).toBe('.')
    })

    it('should return the correct separator (assuming Intl support) for en-US locale', () => {
      // Mocking navigator.language for more specific tests if needed:
      Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true })
      expect(getDecimalSeparatorForCurrentLocale()).toBe('.')
    })

    it('should return the correct separator (assuming Intl support) for fr-FR locale', () => {
      Object.defineProperty(navigator, 'language', { value: 'fr-FR', configurable: true })
      expect(getDecimalSeparatorForCurrentLocale()).toBe(',')
      // Reset navigator.language to its original value
      Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true })
    })

    it('should not return a number', () => {
      expect(isNaN(Number(getDecimalSeparatorForCurrentLocale()))).toBe(true)
    })
  })

  describe('localizeNumber', () => {
    it('should format numbers with thousand separators', () => {
      expect(localizeNumber('1234', { min: 0, max: 0 })).toBe('1,234')
      expect(localizeNumber('1234567', { min: 0, max: 0 })).toBe('1,234,567')
      expect(localizeNumber('1234.567', { min: 2, max: 2 })).toBe('1,234.57')
    })

    it('should handle special notations', () => {
      expect(localizeNumber('<0.001', { min: 3, max: 3 })).toBe('<0.001')
      expect(localizeNumber('<1', { min: 0, max: 0 })).toBe('<1')
    })

    it('should respect precision parameter', () => {
      expect(localizeNumber('1234.5678', { min: 2, max: 2 })).toBe('1,234.57')
      expect(localizeNumber('1234.5678', { min: 3, max: 3 })).toBe('1,234.568')
      expect(localizeNumber('1234.5', { min: 3, max: 3 })).toBe('1,234.500')
    })

    it('should handle different locales', () => {
      // Using en-US locale (default)
      expect(localizeNumber('1234.56', { min: 2, max: 2 })).toBe('1,234.56')

      // Using de-DE locale (German)
      expect(localizeNumber('1234.56', { min: 2, max: 2 }, 'de-DE')).toBe('1.234,56')

      // Using fr-FR locale (French)
      expect(localizeNumber('1234.56', { min: 2, max: 2 }, 'fr-FR')).toBe('1 234,56')
    })

    it('should handle invalid number strings', () => {
      expect(localizeNumber('invalid', { min: 2, max: 2 })).toBe('invalid')
      expect(localizeNumber('abc123', { min: 2, max: 2 })).toBe('abc123')
    })

    it('should handle zero and negative numbers', () => {
      expect(localizeNumber('0', { min: 2, max: 2 })).toBe('0.00')
      expect(localizeNumber('-1234.56', { min: 2, max: 2 })).toBe('-1,234.56')
      expect(localizeNumber('-1234', { min: 0, max: 0 })).toBe('-1,234')
    })
  })

  describe('formatAvg', () => {
    it('should format average with 2 decimal places', () => {
      expect(formatAvg(1234.5678)).toBe('1,234.57')
      expect(formatAvg(1.2)).toBe('1.20')
      expect(formatAvg(0)).toBe('0.00')
    })

    it('should handle negative averages', () => {
      expect(formatAvg(-1234.5678)).toBe('-1,234.57')
      expect(formatAvg(-1.2)).toBe('-1.20')
    })

    it('should format large numbers with thousand separators', () => {
      expect(formatAvg(1234567.89)).toBe('1,234,567.89')
      expect(formatAvg(1000000)).toBe('1,000,000.00')
    })
  })

  describe('formatPercentage', () => {
    it('should format normal percentages with 2 decimal places', () => {
      expect(formatPercentage(12.3456 as Percentage)).toBe('12.35')
      expect(formatPercentage(12.2 as Percentage)).toBe('12.20')
    })

    it('should prefix with a figure space if integer part is one digit', () => {
      expect(formatPercentage(1.2 as Percentage)).toBe('\u20071.20')
      expect(formatPercentage(0.5 as Percentage)).toBe('\u20070.50')
    })

    it('should handle very small percentages', () => {
      expect(formatPercentage(0.009 as Percentage)).toBe('\u20070.01')
      expect(formatPercentage(0.001 as Percentage)).toBe('<0.01')
      expect(formatPercentage(0 as Percentage)).toBe('\u20070.00')
    })

    it('should handle zero and negative percentages', () => {
      expect(formatPercentage(0 as Percentage)).toBe('\u20070.00')
      expect(formatPercentage(-12.34 as Percentage)).toBe('-12.34')
    })

    it('should format large percentages with thousand separators', () => {
      expect(formatPercentage(1234.56 as Percentage)).toBe('1,234.56')
      expect(formatPercentage(1000 as Percentage)).toBe('1,000.00')
    })
  })
})
