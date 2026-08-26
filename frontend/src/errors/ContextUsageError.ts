import { BaseError, BaseErrorParams } from 'src/errors/BaseError'
import { TKey } from 'src/modules/translation/TKey'

export type ContextUsageErrorParams = BaseErrorParams

// Represents an error if context is requested outside of provider
export class ContextUsageError extends BaseError {
  constructor(params: ContextUsageErrorParams) {
    super(params)
  }

  override getDefaultTKey(): TKey {
    return 'error-messages.defaults.context-usage'
  }
}
