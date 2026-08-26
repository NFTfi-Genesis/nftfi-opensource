import { BaseError, BaseErrorParams } from 'src/errors/BaseError'
import { TKey } from 'src/modules/translation/TKey'

export type UnknownErrorParams = BaseErrorParams & {
  stack?: string
}

// Represents an error that is not known to the application
export class UnknownError extends BaseError {
  constructor(params: UnknownErrorParams) {
    super(params)
    if (params.stack) {
      this.stack = params.stack
      this.details.stack = params.stack
    }
  }

  override getDefaultTKey(): TKey {
    return 'error-messages.defaults.unknown'
  }
}
