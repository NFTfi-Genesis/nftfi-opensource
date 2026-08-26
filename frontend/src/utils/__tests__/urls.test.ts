import { describe, it, expect } from 'vitest'
import { safeUrlJoin } from '../urls'

describe('urls utils', () => {
  describe('safeUrlJoin', () => {
    it('should join base URL and endpoint correctly', () => {
      expect(safeUrlJoin('http://example.com', 'api')).toBe('http://example.com/api')
      expect(safeUrlJoin('http://example.com/', 'api')).toBe('http://example.com/api')
      expect(safeUrlJoin('http://example.com', '/api')).toBe('http://example.com/api')
      expect(safeUrlJoin('http://example.com/', '/api')).toBe('http://example.com/api')
    })

    it('should handle endpoints with query parameters', () => {
      expect(safeUrlJoin('http://example.com', 'api?query=1')).toBe('http://example.com/api?query=1')
      expect(safeUrlJoin('http://example.com/', '/api?query=1')).toBe('http://example.com/api?query=1')
    })

    it('should handle complex URLs', () => {
      expect(safeUrlJoin('http://example.com/path', 'api')).toBe('http://example.com/path/api')
      expect(safeUrlJoin('http://example.com/path/', '/api')).toBe('http://example.com/path/api')
      expect(safeUrlJoin('http://example.com/path', '/api')).toBe('http://example.com/path/api')
      expect(safeUrlJoin('http://example.com/path/', 'api')).toBe('http://example.com/path/api')
    })

    it('should handle empty endpoint', () => {
      expect(safeUrlJoin('http://example.com', '')).toBe('http://example.com/')
      expect(safeUrlJoin('http://example.com/', '')).toBe('http://example.com/')
    })
  })
})
