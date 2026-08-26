import { config } from 'src/config/config'
import { isUnauthorizedError } from 'src/errors/HttpError'
import { PanicError } from 'src/errors/PanicError'
import { Address } from 'src/entities/base/Address'
import { AuthMode } from 'src/services/types/AuthMode'
import { createHttpJsonMutator, CreateHttpJsonMutatorParams, HttpJsonMutatorParams } from '../http/createHttpJsonMutator'
import { createNftfiLegacyApiHeaders } from './nftfiLegacyApiHeaders'

export type CreateNftfiLegacyApiMutatorParams = Omit<CreateHttpJsonMutatorParams, 'baseUrl'> & {
  authMode?: AuthMode
}

export type NftfiLegacyApiMutatorParams = HttpJsonMutatorParams

export type NftfiLegacyApiMutatorDependencies<TAuthMode extends AuthMode>
  = TAuthMode extends AuthMode.None
    ? {
      walletAddress: Address
    }
    : TAuthMode extends AuthMode.Optional | AuthMode.Required
      ? {
        ensureAuthToken: (authMode: AuthMode) => Promise<string | null>
        unauthorize: () => void
        walletAddress: Address
      }
      : never

export function createNftfiLegacyApiMutator<TResponse, TAuthMode extends AuthMode = AuthMode.Optional>({
  method,
  headers,
  authMode = AuthMode.Optional as TAuthMode,
}: CreateNftfiLegacyApiMutatorParams) {
  const httpMutator = createHttpJsonMutator<TResponse>({
    baseUrl: config.apiServices.nftfiApiUrl,
    method,
    headers: createNftfiLegacyApiHeaders(headers),
  })

  return async (params: NftfiLegacyApiMutatorParams, deps: NftfiLegacyApiMutatorDependencies<TAuthMode>): Promise<TResponse> => {
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
          'X-Account': deps.walletAddress,
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
