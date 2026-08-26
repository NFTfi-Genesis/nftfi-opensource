import { Address } from 'src/entities/base/Address'
import { Contact } from 'src/entities/domain/Contact'
import { ApiContactDto, convertApiContactToContact } from 'src/services/fetchers/account/getContacts'
import { createNftfiApiMutator, NftfiApiMutatorDependencies } from '../../factories/nftfiApi/createNftfiApiMutator'
import { AuthMode } from '../../types/AuthMode'
import { HttpMethod } from '../../types/HttpMethod'
import { convertContactToRequestBody } from './contactRequestBody'

const createContactMutator = createNftfiApiMutator<ApiContactDto, AuthMode.Required>({
  authMode: AuthMode.Required,
  method: HttpMethod.POST,
})

export async function createContact(
  walletAddress: Address,
  contact: Omit<Contact, 'contactId' | 'createdAt'>,
  deps: NftfiApiMutatorDependencies<AuthMode.Required>
): Promise<Contact> {
  const response = await createContactMutator({
    url: `/v1/accounts/${walletAddress}/contacts`,
    body: convertContactToRequestBody(contact),
  }, deps)
  return convertApiContactToContact(response, new Map())
}
