import { Address } from 'src/entities/base/Address'
import { createNftfiApiFetcher } from '../../factories/nftfiApi/createNftfiApiFetcher'
import { AuthMode } from '../../types/AuthMode'

type ApiSanctionedResponse = {
  wallet: Address
  flagged: boolean
}

const sanctionedFetcher = createNftfiApiFetcher<ApiSanctionedResponse, AuthMode.None>({
  authMode: AuthMode.None,
})

export async function getSanctioned(walletAddress: Address): Promise<boolean> {
  const response = await sanctionedFetcher({
    url: `/v1/accounts/${walletAddress}/sanctioned`,
  }, null as never)

  return response.flagged
}
