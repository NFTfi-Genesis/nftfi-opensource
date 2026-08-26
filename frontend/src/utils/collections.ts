import { PanicError } from 'src/errors/PanicError'

export function parseCollectionTokenRange(
  range: string,
  context?: Record<string, unknown>
): { start: bigint, end: bigint } {
  if (!range || typeof range !== 'string') {
    throw new PanicError({
      message: 'Invalid collectionTokenRange: missing or not a string',
      details: { range, ...context },
    })
  }

  const parts = range.split(':')
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new PanicError({
      message: 'Invalid collectionTokenRange format: expected "start:end"',
      details: { range, ...context },
    })
  }

  try {
    const start = BigInt(parts[0])
    const end = BigInt(parts[1])

    if (start > end) {
      throw new PanicError({
        message: 'Invalid collectionTokenRange: start > end',
        details: { range, start: start.toString(), end: end.toString(), ...context },
      })
    }

    return { start, end }
  } catch (error) {
    if (error instanceof PanicError) throw error

    throw new PanicError({
      message: 'Invalid collectionTokenRange: cannot convert to BigInt',
      details: {
        range,
        error: error instanceof Error
          ? error.message
          : String(error),
        ...context,
      },
    })
  }
}
