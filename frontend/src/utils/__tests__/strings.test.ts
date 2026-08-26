import { describe, it, expect } from 'vitest'
import { truncateText } from '../strings'

describe('strings utils', () => {
  describe('truncateText', () => {
    it('should return original text when within limit', () => {
      expect(truncateText('Hello', 10)).toBe('Hello')
    })

    it('should return original text when at limit', () => {
      expect(truncateText('Hello', 5)).toBe('Hello')
    })

    it('should truncate and add ellipsis when over limit', () => {
      expect(truncateText('Hello World', 5)).toBe('He...')
    })
  })
})
