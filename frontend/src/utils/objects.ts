/**
 * Checks whether an object has any field that would be:
 * - non-empty array
 * - non-empty object
 * - non-falsy value
 */
export function hasAnyValue(obj: Record<string, unknown>): boolean {
  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) {
      if (value.length > 0) {
        return true
      }
    } else if (value !== null && typeof value === 'object') {
      // Check if object has any keys
      if (Object.keys(value).length > 0) {
        return true
      }
    } else if (value) {
      // Non-falsy primitive value
      return true
    }
  }
  return false
}
