import { HttpError } from 'src/errors/HttpError'
import { FetchError } from 'src/errors/FetchError'
import { safeUrlJoin } from 'src/utils/urls'
import { JSONArray, JSONObject } from 'src/typesUtils'
import { HttpMethod } from '../../types/HttpMethod'

export type CreateHttpJsonFetcherParams<TIncludeHeaders extends boolean = false> = {
  baseUrl: string
  headers?: Record<string, string>
  method?: HttpMethod
  includeHeaders?: TIncludeHeaders
}

export type HttpJsonFetcherParams = {
  url: string
  headers?: Record<string, string>
  body?: JSONObject | JSONArray | null
}

export type HttpJsonFetcherResponse<TResponse, TIncludeHeaders extends boolean = false> = TIncludeHeaders extends true
  ? { data: TResponse, headers: Headers }
  : TResponse

export function createHttpJsonFetcher<TResponse, TIncludeHeaders extends boolean = false>({ baseUrl, headers: baseHeaders, method, includeHeaders = false as TIncludeHeaders }: CreateHttpJsonFetcherParams<TIncludeHeaders>) {
  /**
   * @throws HttpError
   */
  return async ({ url, headers, body }: HttpJsonFetcherParams): Promise<HttpJsonFetcherResponse<TResponse, TIncludeHeaders>> => {
    const resolvedUrl = safeUrlJoin(baseUrl, url)
    const resolvedMethod = method ?? HttpMethod.GET
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

      let data: TResponse
      if (response.status === 204) {
        data = null as TResponse
      } else if ((await response.clone().text()).length === 0) {
        data = null as TResponse
      } else {
        data = await response.json() as TResponse
      }

      if (includeHeaders) {
        return { data, headers: response.headers } as HttpJsonFetcherResponse<TResponse, TIncludeHeaders>
      }

      return data as HttpJsonFetcherResponse<TResponse, TIncludeHeaders>
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
