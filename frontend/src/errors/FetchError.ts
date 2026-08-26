import { BaseError, BaseErrorParams } from 'src/errors/BaseError'
import { TKey } from 'src/modules/translation/TKey'
import { HttpMethod } from 'src/services/types/HttpMethod'
import { JSONObject } from 'src/typesUtils'
import { redactTokensFromBody, redactTokensFromHeaders } from 'src/utils/errors'

export type FetchErrorParams = BaseErrorParams & {
  url: string
  method: HttpMethod
  body: JSONObject | undefined
  headers: Record<string, string>
}

// Represents an error thrown by a fetch operation itself, not a non-200 response
export class FetchError extends BaseError {
  constructor(params: FetchErrorParams) {
    super(params)
    this.details = {
      ...this.details,
      url: params.url,
      method: params.method,
      body: redactTokensFromBody(params.body),
      headers: redactTokensFromHeaders(params.headers),
    }
    this.message = `${params.method} ${params.url} - ${this.message}`
  }

  override getDefaultTKey(): TKey {
    return 'error-messages.defaults.fetch'
  }
}

export const isFetchError = (error: unknown): error is FetchError => {
  return error instanceof FetchError
}
