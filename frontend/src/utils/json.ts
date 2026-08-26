const jsonParseCache = new Map<string, unknown>()
const jsonParseCacheTimeouts = new Map<string, NodeJS.Timeout>()

const jsonParseCacheTime = 1000 * 60 * 15 // 15 minutes

function scheduleJsonParseCacheCleanup(key: string) {
  clearTimeout(jsonParseCacheTimeouts.get(key))
  jsonParseCacheTimeouts.set(key, setTimeout(() => {
    jsonParseCache.delete(key)
  }, jsonParseCacheTime))
}

export function jsonParseCached<T = unknown>(value: string): T {
  if (jsonParseCache.has(value)) {
    scheduleJsonParseCacheCleanup(value)
    return jsonParseCache.get(value) as T
  }
  const parsedValue = JSON.parse(value)
  jsonParseCache.set(value, parsedValue)
  scheduleJsonParseCacheCleanup(value)
  return parsedValue as T
}

export function jsonStringify(obj: unknown, indentation?: number): string {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString()
    }
    if (typeof value === 'function') {
      return 'FUNCTION_REDACTED'
    }
    if (typeof value === 'symbol') {
      return 'SYMBOL_REDACTED'
    }
    return value
  }, indentation)
}
