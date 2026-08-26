import { config } from 'src/config/config'
import { HttpError } from 'src/errors/HttpError'
import { HttpMethod } from 'src/services/types/HttpMethod'
import { safeUrlJoin } from 'src/utils/urls'

export async function fetchRefreshAuthToken({
  refreshToken,
}: {
  refreshToken: string
}): Promise<{
  token: string
  refreshToken: string
}> {
  const resolvedUrl = safeUrlJoin(config.apiServices.nftfiSdkApiUrl, '/v0.1/authorization/refresh-token')
  const resolvedMethod = HttpMethod.POST
  const resolvedHeaders = {
    'Content-Type': 'application/json',
    'x-api-key': config.apiServices.nftfiSdkApiKey,
  }
  const resolvedBody = JSON.stringify({ refreshToken })
  const response = await fetch(resolvedUrl, {
    method: resolvedMethod,
    headers: resolvedHeaders,
    body: resolvedBody,
  })
  if (!response.ok) {
    throw new HttpError({
      message: `Failed to refresh auth token: ${response.statusText}`,
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
  const data = await response.json()
  if (!data.result || !data.result.token || !data.result.refreshToken) {
    throw new HttpError({
      message: `Invalid response from refresh auth token`,
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
  return {
    token: data.result.token,
    refreshToken: data.result.refreshToken,
  }
}
