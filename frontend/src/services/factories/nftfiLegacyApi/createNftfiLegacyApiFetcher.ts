import { createHttpJsonFetcher, CreateHttpJsonFetcherParams, HttpJsonFetcherParams, HttpJsonFetcherResponse } from 'src/services/factories/http/createHttpJsonFetcher'
import { config } from 'src/config/config'
import { AuthMode } from 'src/services/types/AuthMode'
import { isUnauthorizedError } from 'src/errors/HttpError'
import { PanicError } from 'src/errors/PanicError'
import { createNftfiLegacyApiHeaders } from './nftfiLegacyApiHeaders'

export type CreateNftfiLegacyApiFetcherParams<TIncludeHeaders extends boolean = false> = Omit<CreateHttpJsonFetcherParams<TIncludeHeaders>, 'baseUrl'> & {
  authMode?: AuthMode
}

export type NftfiLegacyApiFetcherParams = HttpJsonFetcherParams

export type NftfiLegacyApiFetcherDependencies<TAuthMode extends AuthMode>
  = TAuthMode extends AuthMode.None
    ? {
      walletAddress: string
    }
    : TAuthMode extends AuthMode.Optional | AuthMode.Required
      ? {
        walletAddress: string
        ensureAuthToken: (authMode: AuthMode) => Promise<string | null>
        unauthorize: () => void
      }
      : never

export function createNftfiLegacyApiFetcher<TResponse, TAuthMode extends AuthMode = AuthMode.None, TIncludeHeaders extends boolean = false>({ headers, authMode = AuthMode.None as TAuthMode, includeHeaders = false as TIncludeHeaders }: CreateNftfiLegacyApiFetcherParams<TIncludeHeaders>) {
  const httpFetcher = createHttpJsonFetcher<TResponse, TIncludeHeaders>({
    baseUrl: config.apiServices.nftfiApiUrl,
    headers: createNftfiLegacyApiHeaders(headers),
    includeHeaders,
  })

  return async (
    params: NftfiLegacyApiFetcherParams,
    deps: NftfiLegacyApiFetcherDependencies<TAuthMode>
  ): Promise<HttpJsonFetcherResponse<TResponse, TIncludeHeaders>> => {
    const { url, headers } = params

    const authHeaders: Record<string, string> = {}
    if (authMode !== AuthMode.None && 'ensureAuthToken' in deps) {
      const token = await deps.ensureAuthToken(authMode)
      if (token) {
        authHeaders.Authorization = `Bearer ${token}`
      }
    }

    try {
      return await httpFetcher({
        url,
        headers: {
          ...authHeaders,
          'X-Account': deps.walletAddress,
          ...headers,
        },
      }) as HttpJsonFetcherResponse<TResponse, TIncludeHeaders>
    } catch (error) {
      if (isUnauthorizedError(error)) {
        if ('unauthorize' in deps) {
          deps.unauthorize()
        }
        throw new PanicError({
          message: 'Unauthorized error after auth token was ensured',
          details: {
            error,
            authMode,
          },
        })
      }

      throw error
    }
  }
}
