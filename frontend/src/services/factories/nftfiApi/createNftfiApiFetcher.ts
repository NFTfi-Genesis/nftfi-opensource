import { createHttpJsonFetcher, CreateHttpJsonFetcherParams, HttpJsonFetcherParams, HttpJsonFetcherResponse } from 'src/services/factories/http/createHttpJsonFetcher'
import { config } from 'src/config/config'
import { isUnauthorizedError } from 'src/errors/HttpError'
import { AuthMode } from 'src/services/types/AuthMode'
import { PanicError } from 'src/errors/PanicError'

export type CreateNftfiApiFetcherParams<TIncludeHeaders extends boolean = false> = Omit<CreateHttpJsonFetcherParams<TIncludeHeaders>, 'baseUrl'> & {
  authMode?: AuthMode
}

export type NftfiApiFetcherParams = HttpJsonFetcherParams

export type NftfiApiFetcherDependencies<TAuthMode extends AuthMode>
  = TAuthMode extends AuthMode.None
    ? never
    : TAuthMode extends AuthMode.Optional | AuthMode.Required
      ? {
        ensureAuthToken: (authMode: AuthMode) => Promise<string | null>
        unauthorize: () => void
      }
      : never

export function createNftfiApiFetcher<TResponse, TAuthMode extends AuthMode = AuthMode.None, TIncludeHeaders extends boolean = false>({ headers, authMode = AuthMode.None as TAuthMode, includeHeaders }: CreateNftfiApiFetcherParams<TIncludeHeaders>) {
  const httpFetcher = createHttpJsonFetcher<TResponse, TIncludeHeaders>({
    baseUrl: config.apiServices.nftfiSdkApiUrl,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiServices.nftfiSdkApiKey,
      ...headers,
    },
    includeHeaders,
  })

  return async (params: NftfiApiFetcherParams, deps: NftfiApiFetcherDependencies<TAuthMode>): Promise<HttpJsonFetcherResponse<TResponse, TIncludeHeaders>> => {
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
          ...headers,
        },
      })
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
