export function safeUrlJoin(base: string, endpoint: string) {
  // Add a trailing slash to the base URL if it doesn't already have one
  const normalizedBase = base.endsWith('/')
    ? base
    : base + '/'
  // Remove a leading slash from the endpoint if it has one
  const normalizedEndpoint = endpoint.startsWith('/')
    ? endpoint.slice(1)
    : endpoint
  const baseUrl = new URL(normalizedBase)
  const fullUrl = new URL(normalizedEndpoint, baseUrl)
  return fullUrl.toString()
}

// Helper function to parse URL and separate pathname from search params
export function parseUrl(url: string): {
  pathname: string
  search: string
} {
  const [pathname, search = ''] = url.split('?')
  return {
    pathname,
    search: search
      ? `?${search}`
      : '',
  }
}

// Merge two query strings, with the second taking precedence
export function mergeQS(existingSearch: string, newSearch: string): string {
  const existingParams = new URLSearchParams(existingSearch)
  const newParams = new URLSearchParams(newSearch)
  newParams.forEach((value, key) => {
    existingParams.set(key, value)
  })
  const merged = existingParams.toString()
  return merged
    ? `?${merged}`
    : ''
}
