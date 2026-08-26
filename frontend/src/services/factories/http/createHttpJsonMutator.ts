import { HttpError } from 'src/errors/HttpError'
import { FetchError } from 'src/errors/FetchError'
import { JSONArray, JSONObject } from 'src/typesUtils'
import { safeUrlJoin } from 'src/utils/urls'
import { HttpMethod } from '../../types/HttpMethod'

export type CreateHttpJsonMutatorParams = {
  baseUrl: string
  headers?: Record<string, string>
  method?: HttpMethod
}

export type HttpJsonMutatorParams = {
  url: string
  headers?: Record<string, string>
  body?: JSONObject | JSONArray | null
}

export function createHttpJsonMutator<TResponse>({ baseUrl, headers: baseHeaders, method }: CreateHttpJsonMutatorParams) {
  /**
   * @throws HttpError
   */
  return async ({ url, headers, body }: HttpJsonMutatorParams): Promise<TResponse> => {
    const resolvedUrl = safeUrlJoin(baseUrl, url)
    const resolvedMethod = method ?? HttpMethod.POST
    const resolvedHeaders = {
      ...baseHeaders,
      ...headers,
      'Content-Type': 'application/json',
    }
    const resolvedBody = body
      ? JSON.stringify(body)
      : undefined
    try {
      const response = await fetch(resolvedUrl, {
        method: resolvedMethod,
        headers: resolvedHeaders,
        body: resolvedBody,
      })

      if (!response.ok) {
        throw new HttpError({
          message: `${response.status} ${response.statusText}`,
          status: response.status,
          statusText: response.statusText,
          response: await response.text(),
          url: resolvedUrl,
          method: resolvedMethod,
          body: resolvedBody
            ? JSON.parse(resolvedBody)
            : undefined,
          headers: resolvedHeaders,
        })
      }

      if (response.status === 204) {
        return null as TResponse
      }

      if ((await response.clone().text()).length === 0) {
        return null as TResponse
      }

      if (response.headers.get('Content-Type')?.includes('application/json')) {
        return await response.json() as TResponse
      }

      return null as TResponse
    } catch (error) {
      if (error instanceof HttpError) {
        throw error
      }
      throw new FetchError({
        message: error.message,
        url: resolvedUrl,
        method: resolvedMethod,
        body: resolvedBody
          ? JSON.parse(resolvedBody)
          : undefined,
        headers: resolvedHeaders,
      })
    }
  }
}
