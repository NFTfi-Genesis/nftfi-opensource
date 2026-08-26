import { config } from 'src/config/config'
import { HttpMethod } from 'src/services/types/HttpMethod'
import { createHttpJsonFetcher, CreateHttpJsonFetcherParams, HttpJsonFetcherParams } from '../http/createHttpJsonFetcher'

export type CreateAlchemyFetcherParams = Omit<CreateHttpJsonFetcherParams, 'baseUrl'>
export type AlchemyFetcherParams = HttpJsonFetcherParams

export function createAlchemyFetcher<TResponse>({ headers: baseHeaders, method = HttpMethod.POST }: CreateAlchemyFetcherParams) {
  const httpFetcher = createHttpJsonFetcher<TResponse>({
    baseUrl: config.apiServices.alchemyApiUrl,
    headers: baseHeaders,
    method,
  })

  return async (params: AlchemyFetcherParams): Promise<TResponse | null> => {
    const { url, headers, body } = params

    return await httpFetcher({
      url,
      headers,
      body,
    })
  }
}
