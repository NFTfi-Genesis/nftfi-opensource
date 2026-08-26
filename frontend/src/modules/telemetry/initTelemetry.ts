import { init, browserTracingIntegration, replayIntegration } from '@sentry/react'
import { CustomError } from 'src/errors/CustomError'

declare global {
  interface Window {
    sendTestError: () => void
  }
}

export function initTelemetry() {
  init({
    dsn: 'https://af293b0024da6f67011e83f0b8055ebb@o616144.ingest.us.sentry.io/4508489946365952',
    integrations: [
      browserTracingIntegration(),
      replayIntegration(),
    ],
    // release: process.env.TAG_NAME || process.env.SHORT_SHA,
    environment: getSentryEnvironmentName(),
    tracesSampleRate: 1.0,
    normalizeDepth: 10,
  })

  window.sendTestError = sendTestError
}

function sendTestError() {
  const error = new CustomError({
    message: 'Test error',
    name: 'TestError',
    tKey: 'error-messages.defaults.unknown',
    details: {
      test1: 'test1',
      test2: 'test2',
      test3: 'test3',
      testArray: [1, 2, 3],
      testObject: {
        test1: 'test1',
        test2: 'test2',
        test3: 'test3',
      },
    },
  })
  error.sendTelemetry()
}

function getSentryEnvironmentName() {
  const subdomain = window.location.hostname.split('.')[0]
  if (subdomain === 'app') return 'production'
  if (subdomain === 'localhost') return 'development'
  return 'unknown'
}
