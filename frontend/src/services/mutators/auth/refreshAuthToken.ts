import { config } from 'src/config/config'
import { HttpMethod } from 'src/services/types/HttpMethod'
import { createHttpJsonMutator } from 'src/services/factories/http/createHttpJsonMutator'

export type NftfiApiRefreshAuthTokenResponse = {
  token: string
  refreshToken: string
}

const refreshAuthTokenMutator = createHttpJsonMutator<NftfiApiRefreshAuthTokenResponse>({
  method: HttpMethod.POST,
  baseUrl: config.apiServices.nftfiSdkApiUrl,
  headers: {
    'x-api-key': config.apiServices.nftfiSdkApiKey,
  }
})

export async function refreshAuthToken(refreshToken: string): Promise<{
  token: string
  refreshToken: string
}> {
  const response = await refreshAuthTokenMutator({
    url: '/v1/auth/refresh-token',
    body: { refreshToken },
  })
  if (!response.token || !response.refreshToken) {
    throw new Error('Invalid response from refresh auth token')
  }
  return {
    token: response.token,
    refreshToken: response.refreshToken,
  }
}
