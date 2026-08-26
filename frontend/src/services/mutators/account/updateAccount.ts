import { Account } from 'src/entities/domain/Account'
import { Address } from 'src/entities/base/Address'
import { createNftfiApiMutator, NftfiApiMutatorDependencies } from 'src/services/factories/nftfiApi/createNftfiApiMutator'
import { AuthMode } from 'src/services/types/AuthMode'
import { HttpMethod } from 'src/services/types/HttpMethod'
import { ApiAccountResponse, convertApiAccountResponseToAccount } from 'src/services/fetchers/account/getAccount'

const updateAccountMutator = createNftfiApiMutator<ApiAccountResponse, AuthMode.Required>({
  authMode: AuthMode.Required,
  method: HttpMethod.PATCH,
})

export type AccountUpdate = Partial<Pick<Account, 'username' | 'email' | 'discordUsername'>> & {
  communications?: Partial<Account['communications']>
}

type ApiUpdateAccountBody = {
  username?: string
  email?: string
  socials?: {
    discord?: string
  }
  communications?: Partial<Account['communications']>
}

function convertAccountUpdateToBody(update: AccountUpdate): ApiUpdateAccountBody {
  const body: ApiUpdateAccountBody = {}
  if (update.username) body.username = update.username
  if (update.email) body.email = update.email
  if (update.discordUsername) {
    body.socials = { discord: update.discordUsername }
  }
  if (update.communications) body.communications = update.communications
  return body
}

export async function updateAccount(
  walletAddress: Address,
  update: AccountUpdate,
  dependencies: NftfiApiMutatorDependencies<AuthMode.Required>
): Promise<Account> {
  const response = await updateAccountMutator({
    url: `/v1/accounts/${walletAddress}`,
    body: convertAccountUpdateToBody(update),
  }, dependencies)
  return convertApiAccountResponseToAccount(response)
}
