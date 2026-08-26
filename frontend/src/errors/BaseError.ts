import { sendError } from 'src/modules/telemetry/sendError'
import { TKey } from 'src/modules/translation/TKey'

export type BaseErrorParams<TDetails extends Record<string, unknown> = Record<string, unknown>> = {
  message: string
  tKey?: TKey
  captureStackTrace?: boolean
  shouldSendTelemetry?: boolean
  verbose?: boolean
  details?: TDetails
}

// Base class for all errors in the application
export abstract class BaseError<TDetails extends Record<string, unknown> = Record<string, unknown>> extends Error implements Error {
  tKey: TKey
  shouldSendTelemetry: boolean
  shouldCaptureStackTrace: boolean
  verbose: boolean
  details: TDetails

  // Indicates wheter the error has been handled by the application.
  // Error handlers are responsible for setting this flag to true.
  // When the error is within useMutator, it's set by createGenericErrorHandler automatically.
  isHandled: boolean = false

  // Indicates wheter the error has been notified to the user.
  // Set by notificationErrorHandler.
  isNotified: boolean = false

  // Indicates wheter the error has been reported to Sentry.
  // This is set automatically when `sendTelemetry` is called.
  isReported: boolean = false

  constructor({
    message,
    tKey,
    captureStackTrace = true,
    shouldSendTelemetry = true,
    verbose = true,
    details,
  }: BaseErrorParams<TDetails>) {
    super(message)

    this.name = this.getName()
    this.tKey = tKey ?? this.getDefaultTKey()
    this.shouldCaptureStackTrace = captureStackTrace ?? true
    this.shouldSendTelemetry = shouldSendTelemetry ?? true
    this.verbose = verbose
    this.details = details ?? ({} as TDetails)

    if (this.shouldCaptureStackTrace && Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  sendTelemetry() {
    if (!this.shouldSendTelemetry) {
      return
    }
    if (this.isReported) {
      return
    }
    this.isReported = true
    sendError({
      error: this,
      fingerprint: this.getFinalFingerprint(),
      errorName: this.getName(),
      details: this.getDetails(),
    })
  }

  getName(): string {
    return (this.constructor as typeof BaseError).name
  }

  private getFinalFingerprint(): string {
    const hostname = window.location.hostname
    return `${hostname}-${this.getFingerprint()}`
  }

  // --------- Overridable methods ---------

  /*
   * Default translation key to be if not provided by call site.
   */
  abstract getDefaultTKey(): TKey

  /**
   * Extra details to be sent to telemetry.
   */
  getDetails(): TDetails {
    return this.details
  }

  /**
   * Fingerprint to be used to group errors in Sentry.
   */
  getFingerprint(): string {
    return `${this.getName()}-${this.message}`
  }
}
