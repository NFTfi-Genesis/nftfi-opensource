import { BaseError, BaseErrorParams } from 'src/errors/BaseError'
import { TKey } from 'src/modules/translation/TKey'

export type PanicErrorParams = BaseErrorParams

// Represents an error that is used for abnormal situations that should not happen.
export class PanicError extends BaseError {
  constructor(params: PanicErrorParams) {
    super(params)
  }

  override getDefaultTKey(): TKey {
    return 'error-messages.defaults.panic'
  }
}

export const isPanicError = (error: unknown): error is PanicError => {
  return error instanceof PanicError
}
