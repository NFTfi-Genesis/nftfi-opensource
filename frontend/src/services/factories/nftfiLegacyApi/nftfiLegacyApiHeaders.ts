export function createNftfiLegacyApiHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Tag': btoa(Date.now().toString(17)),
    ...additionalHeaders,
  }
}
