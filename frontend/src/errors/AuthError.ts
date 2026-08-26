import { BaseError, BaseErrorParams } from 'src/errors/BaseError'
import { TKey } from 'src/modules/translation/TKey'

export type AuthErrorParams = BaseErrorParams

// Represents any error that is related to authentication against NFTfi API
export class AuthError extends BaseError {
  constructor(params: AuthErrorParams) {
    super(params)
  }

  override getDefaultTKey(): TKey {
    return 'error-messages.defaults.authentication'
  }
}

export const isAuthError = (error: unknown): error is AuthError => {
  return error instanceof AuthError
}
