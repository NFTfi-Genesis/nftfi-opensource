import { describe, expect, it, vi } from 'vitest'

import { traversePages } from '../fetchers'

describe('traversePages', () => {
  it('aggregates results across multiple pages until the final page has fewer items than the limit', async () => {
    type NumberPage = { results: number[] }
    type NumberFetcher = (page: number) => Promise<NumberPage>

    const fetcher = vi
      .fn<Parameters<NumberFetcher>, ReturnType<NumberFetcher>>()
      .mockResolvedValueOnce({ results: [1, 2] })
      .mockResolvedValueOnce({ results: [3] })

    const result = await traversePages(fetcher, 2)

    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(fetcher).toHaveBeenNthCalledWith(1, 1)
    expect(fetcher).toHaveBeenNthCalledWith(2, 2)
    expect(result).toEqual({ results: [1, 2, 3] })
  })

  it('stops after the first page when it returns fewer items than the limit', async () => {
    type StringPage = { results: string[] }
    type StringFetcher = (page: number) => Promise<StringPage>

    const fetcher = vi
      .fn<Parameters<StringFetcher>, ReturnType<StringFetcher>>()
      .mockResolvedValueOnce({ results: ['only-one'] })

    const result = await traversePages(fetcher, 2)

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher).toHaveBeenCalledWith(1)
    expect(result).toEqual({ results: ['only-one'] })
  })
})
