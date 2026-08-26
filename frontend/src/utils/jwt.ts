export function getJwtTokenPayload(token: string): Record<string, unknown> {
  try {
    const payloadEncoded = token.split('.')[1]
    const payloadDecoded = atob(payloadEncoded)
    const payload = JSON.parse(payloadDecoded) as { exp: number }
    return payload
  } catch {
    throw new Error('Invalid JWT token')
  }
}

export function getJwtTokenExpiry(token: string): number {
  const payload = getJwtTokenPayload(token)
  if (!payload.exp || typeof payload.exp !== 'number') {
    throw new Error('Invalid JWT token')
  }
  return payload.exp
}

export function validateJwtToken(token: string): boolean {
  return getJwtTokenExpiry(token) > (Date.now() / 1000)
}
