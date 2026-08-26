import { ReactNode } from 'react'
import { jsonStringify } from 'src/utils/json'
import { VerboseErrorNotification } from 'src/components/VerboseErrorNotification'
import { BaseError } from 'src/errors/BaseError'
import { UnknownError } from 'src/errors/UnknownError'
import { NotificationType, notify } from 'src/modules/notifications/notify'
import { TFunction } from 'src/modules/translation/TFunction'
import { JSONObject } from 'src/typesUtils'

export type ErrorHandler = (err: BaseError) => void

/**
 * Converts unknown error to a subtype of BaseError.
 * @param err - Unknown error to be recognized.
 * @returns BaseError - Subtype of BaseError.
 */
export function recognizeError(err: Error): BaseError {
  if (err instanceof BaseError) {
    return err
  }
  return new UnknownError({ message: err.message, details: { error: err } })
}

export const createErrorHandler = (errorHandler: ErrorHandler) => (err: Error) => {
  const baseError = recognizeError(err)
  errorHandler(baseError)
  baseError.sendTelemetry()
  baseError.isHandled = true
}

export const notificationErrorHandler: (t: TFunction) => ErrorHandler = (t: TFunction) => (err: BaseError) => {
  if (err.isNotified) {
    return
  }
  console.error('Caught error and notified:', err, err.details)
  if (err.verbose) {
    // TODO: think about better way to handle "pretty" BE error messages to display to user
    // Check if error includes specific patterns and provide specific message
    let subtitle: string | undefined
    const errorDetailsString = jsonStringify(err.details?.response ?? err.details) ?? ''
    for (const { pattern, replacement } of errorMessageReplacements) {
      if (errorDetailsString.includes(pattern)) {
        subtitle = replacement
        break
      }
    }
    const message: ReactNode = <VerboseErrorNotification title={t(err.tKey)} details={err.details} subtitle={subtitle} />
    notify({ message, variant: NotificationType.Error, duration: 10000 })
  } else {
    const message: ReactNode = t(err.tKey)
    notify({ message, variant: NotificationType.Error })
  }
  err.sendTelemetry()
  err.isHandled = true
  err.isNotified = true
}

export const silentErrorHandler: ErrorHandler = (err: BaseError) => {
  console.error('Caught error silently:', err, err.details)
  err.sendTelemetry()
  err.isHandled = true
}

export function installGlobalErrorHandlers() {
  const errorHandler = createErrorHandler(silentErrorHandler)

  window.addEventListener('error', event => {
    errorHandler(event.error instanceof Error
      ? event.error
      : new Error(event.message))
  })

  window.addEventListener('unhandledrejection', event => {
    errorHandler(new Error(event.reason || event))
  })
}

export function redactTokensFromHeaders(headers: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!headers) {
    return undefined
  }
  const redactedHeaders = { ...headers }
  if (redactedHeaders['Authorization']) {
    redactedHeaders['Authorization'] = 'REDACTED'
  }
  if (redactedHeaders['x-api-key']) {
    redactedHeaders['x-api-key'] = 'REDACTED'
  }
  return redactedHeaders
}

export function redactTokensFromBody(body: JSONObject | undefined): JSONObject | undefined {
  if (!body) {
    return undefined
  }
  const redactedBody = { ...body }
  if (redactedBody.refreshToken) {
    redactedBody.refreshToken = 'REDACTED'
  }
  return redactedBody
}

/**
 * Error message replacements for back-end error messages
 */
const errorMessageReplacements: Array<{ pattern: string, replacement: string }> = [
  {
    pattern: 'Cannot make more than 10 offers per lender, per currency, per loan type and per asset',
    replacement: 'Cannot make more than 10 offers per lender, per currency, per loan type and per asset',
  },
  {
    pattern: 'Cannot make more than 10 offers per lender, per currency, per loan type and per collection',
    replacement: 'Cannot make more than 10 offers per lender, per currency, per loan type and per collection'
  },
]
