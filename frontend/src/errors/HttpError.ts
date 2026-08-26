import { BaseError, BaseErrorParams } from 'src/errors/BaseError'
import { TKey } from 'src/modules/translation/TKey'
import { HttpMethod } from 'src/services/types/HttpMethod'
import { redactTokensFromBody, redactTokensFromHeaders } from 'src/utils/errors'
import { JSONObject } from 'src/typesUtils'

export type HttpErrorParams = BaseErrorParams & {
  status: number
  statusText: string
  response: string
  url: string
  method: HttpMethod
  body: JSONObject | undefined
  headers: Record<string, string>
}

// Represents an non-200 response from an HTTP request
export class HttpError extends BaseError {
  status: number

  constructor(params: HttpErrorParams) {
    super(params)
    this.status = params.status
    this.details = {
      ...this.details,
      status: params.status,
      statusText: params.statusText,
      response: params.response,
      url: params.url,
      method: params.method,
      body: redactTokensFromBody(params.body),
      headers: redactTokensFromHeaders(params.headers),
    }

    this.message = `${params.method} ${params.url} - ${this.status} ${params.statusText}`
  }

  override getDefaultTKey(): TKey {
    return 'error-messages.defaults.http'
  }
}

export const isHttpError = (error: unknown): error is HttpError => {
  return error instanceof HttpError
}

export const isUnauthorizedError = (error: unknown): error is HttpError => {
  return isHttpError(error) && error.status === 401
}

export const isNotFoundError = (error: unknown): error is HttpError => {
  return isHttpError(error) && error.status === 404
}
