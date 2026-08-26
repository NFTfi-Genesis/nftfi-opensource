import { createAlchemyFetcher } from '../../factories/alchemy/createAlchemyFetcher'
import { HttpMethod } from '../../types/HttpMethod'

const gasPriceFetcher = createAlchemyFetcher<AlchemyGasPriceResponse>({
  method: HttpMethod.POST,
})

type AlchemyGasPriceResponse = {
  result: string
}

// TODO: Make it use Wei instead of number
export async function getGasPrice(): Promise<number | null> {
  const gasPrice = await gasPriceFetcher({
    url: '/',
    body: {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_gasPrice',
    },
  })
  return convertAlchemyGasPriceResponseToGasPrice(gasPrice)
}

function convertAlchemyGasPriceResponseToGasPrice(data: AlchemyGasPriceResponse | null): number | null {
  if (data?.result) {
    const gasPrice = parseInt(data.result, 16)
    const gasPriceInGwei = gasPrice / 1e9
    return gasPriceInGwei
  } else {
    return null
  }
}
