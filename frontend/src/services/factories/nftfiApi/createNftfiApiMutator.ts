import { config } from 'src/config/config'
import { isUnauthorizedError } from 'src/errors/HttpError'
import { AuthMode } from 'src/services/types/AuthMode'
import { PanicError } from 'src/errors/PanicError'
import { createHttpJsonMutator, CreateHttpJsonMutatorParams, HttpJsonMutatorParams } from '../http/createHttpJsonMutator'

export type CreateNftfiApiMutatorParams = Omit<CreateHttpJsonMutatorParams, 'baseUrl'> & {
  authMode?: AuthMode
}

export type NftfiApiMutatorParams = HttpJsonMutatorParams

export type NftfiApiMutatorDependencies<TAuthMode extends AuthMode>
  = TAuthMode extends AuthMode.None
    ? {
      walletAddress: string
    }
    : TAuthMode extends AuthMode.Optional | AuthMode.Required
      ? {
        ensureAuthToken: (authMode: AuthMode) => Promise<string | null>
        unauthorize: () => void
      }
      : never

export function createNftfiApiMutator<TResponse, TAuthMode extends AuthMode = AuthMode.Optional>({
  method,
  headers,
  authMode = AuthMode.Optional as TAuthMode,
}: CreateNftfiApiMutatorParams) {
  const httpMutator = createHttpJsonMutator<TResponse>({
    baseUrl: config.apiServices.nftfiSdkApiUrl,
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiServices.nftfiSdkApiKey,
      ...headers,
    },
  })

  return async (params: NftfiApiMutatorParams, deps: NftfiApiMutatorDependencies<TAuthMode>): Promise<TResponse> => {
    const { url, headers, body } = params

    const authHeaders: Record<string, string> = {}
    if (authMode !== AuthMode.None && 'ensureAuthToken' in deps) {
      const token = await deps.ensureAuthToken(authMode)
      if (token) {
        authHeaders.Authorization = `Bearer ${token}`
      }
    }

    try {
      return await httpMutator({
        url,
        headers: {
          ...authHeaders,
          ...headers,
        },
        body,
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
