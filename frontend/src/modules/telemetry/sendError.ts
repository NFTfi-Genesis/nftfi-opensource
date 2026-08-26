import { captureException } from '@sentry/react'
import { takeTelemetrySnapshot } from './telemetryGlobalContext'

export function sendError<TDetails extends Record<string, unknown>>({
  error,
  fingerprint,
  errorName,
  details,
}: {
  error: Error
  fingerprint: string
  errorName: string
  details: TDetails
}): void {
  const globalSnapshot = takeTelemetrySnapshot()

  captureException(error, {
    fingerprint: [fingerprint],
    tags: {
      errorName,
      ...globalSnapshot,
    },
    extra: details
  })
}
