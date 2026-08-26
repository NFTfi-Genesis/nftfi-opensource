import { createNftfiApiMutator, NftfiApiMutatorDependencies } from 'src/services/factories/nftfiApi/createNftfiApiMutator'
import { HttpMethod } from 'src/services/types/HttpMethod'
import { AuthMode } from 'src/services/types/AuthMode'
import { Address } from 'src/entities/base/Address'

const deleteContactMutator = createNftfiApiMutator({
  authMode: AuthMode.Required,
  method: HttpMethod.DELETE,
})

export async function deleteContact(walletAddress: Address, contactId: string, deps: NftfiApiMutatorDependencies<AuthMode.Required>): Promise<void> {
  await deleteContactMutator({
    url: `/v1/accounts/${walletAddress}/contacts/${contactId}`,
  }, deps)
}
