import { PanicError } from 'src/errors/PanicError'

/**
 * Traverse through pages of a paginated API endpoint with a given fetcher function until there are no more data to load.
 * @param fn - The function to call to get the data for a page.
 * @param limit - The number of items per page.
 * @returns The concatenated results of all pages.
 */
export async function traversePages<T extends { results: unknown[] }>(fn: (page: number) => Promise<T>, limit: number, startPage: number = 1): Promise<{ results: T['results'] }> {
  const pagesLimit = 200
  let page = startPage
  let hasMore = true
  let results: T['results'] = []
  while (hasMore) {
    if (page > pagesLimit) {
      throw new PanicError({ message: 'Pages limit reached while traversing pages', details: { page, pagesLimit, results } })
    }
    const data = await fn(page)
    if (data.results.length < limit) {
      hasMore = false
    } else {
      page++
    }
    results = results.concat(data.results)
  }
  return { results }
}
