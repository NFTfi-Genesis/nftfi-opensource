import { BaseError, BaseErrorParams } from 'src/errors/BaseError'
import { TKey } from 'src/modules/translation/TKey'
import { Address } from 'src/entities/base/Address'
import { TxArg } from 'src/services/types/TxArg'

export type OnChainErrorParams = BaseErrorParams & {
  details: {
    code: number | string
    message: string
    rawError: unknown
    from?: Address
    to: Address
    method: string
    args?: TxArg[]
  }
}

// Represents on-chain or signing errors
export class OnChainError extends BaseError {
  constructor(params: OnChainErrorParams) {
    super(params)
  }

  override getDefaultTKey(): TKey {
    return 'error-messages.defaults.onchain-tx'
  }
}
