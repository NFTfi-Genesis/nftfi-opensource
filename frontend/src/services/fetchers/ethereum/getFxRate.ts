import { config } from 'src/config/config'
import { createHttpJsonFetcher } from '../../factories/http/createHttpJsonFetcher'

const fxRateFetcher = createHttpJsonFetcher<FxRateResponse>({
  baseUrl: `${config.apiServices.nftfiSdkApiUrl}/fx-rates/eth-usdt`,
  headers: {
    'x-api-key': config.apiServices.nftfiSdkApiKey,
  },
})

export type FxRateResponse = {
  result: {
    symbol: string
    rate: number
  }
}

export async function getFxRate(): Promise<number | null> {
  const fxRate = await fxRateFetcher({
    url: '/',
  })
  return fxRate?.result.rate ?? null
}
