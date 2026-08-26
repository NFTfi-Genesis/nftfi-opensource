import { BaseError, BaseErrorParams } from 'src/errors/BaseError'
import { TKey } from 'src/modules/translation/TKey'

export type WalletErrorParams = BaseErrorParams

// Represents an error that is related to wallet operations, like requesting signer or provider
export class WalletError extends BaseError {
  constructor(params: WalletErrorParams) {
    super(params)
  }

  override getDefaultTKey(): TKey {
    return 'error-messages.defaults.wallet'
  }
}

export const isWalletError = (error: unknown): error is WalletError => {
  return error instanceof WalletError
}
