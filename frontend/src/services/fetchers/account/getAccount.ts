import { Account, AccountCommsFrequency } from 'src/entities/domain/Account'
import { Address } from 'src/entities/base/Address'
import { isNotFoundError } from 'src/errors/HttpError'
import { sendError } from 'src/modules/telemetry/sendError'
import { createNftfiApiFetcher, NftfiApiFetcherDependencies } from '../../factories/nftfiApi/createNftfiApiFetcher'
import { AuthMode } from '../../types/AuthMode'

type ApiAccountSocials = {
  x?: string
  discord?: string
  telegram?: string
}

type ApiCommunicationsFrequency = {
  frequency: AccountCommsFrequency
}

export type ApiAccountResponse = {
  wallet: Address
  username: string | null
  email: string | null
  socials?: ApiAccountSocials
  communications: {
    refi: ApiCommunicationsFrequency
    maturity: ApiCommunicationsFrequency
    liquidity: ApiCommunicationsFrequency
  }
}

const accountFetcher = createNftfiApiFetcher<ApiAccountResponse, AuthMode.Required>({
  authMode: AuthMode.Required,
})

export async function getAccount(
  walletAddress: Address,
  dependencies: NftfiApiFetcherDependencies<AuthMode.Required>
): Promise<Account | null> {
  try {
    const response = await accountFetcher({
      url: `/v1/accounts/${walletAddress}`,
    }, dependencies)
    return convertApiAccountResponseToAccount(response)
  } catch (error) {
    if (isNotFoundError(error)) {
      sendError({
        error: error as Error,
        fingerprint: 'getAccount.notFound',
        errorName: 'GetAccountNotFound',
        details: { walletAddress },
      })
      return null
    }
    throw error
  }
}

export function convertApiAccountResponseToAccount(response: ApiAccountResponse): Account {
  return {
    account: response.wallet,
    username: response.username || '',
    email: response.email || '',
    discordUsername: response.socials?.discord || '',
    communications: response.communications,
  }
}
