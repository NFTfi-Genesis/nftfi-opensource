import { Address } from 'src/entities/base/Address'
import { Contact } from 'src/entities/domain/Contact'
import { ApiContactDto, convertApiContactToContact } from 'src/services/fetchers/account/getContacts'
import { NftfiApiMutatorDependencies, createNftfiApiMutator } from '../../factories/nftfiApi/createNftfiApiMutator'
import { HttpMethod } from '../../types/HttpMethod'
import { AuthMode } from '../../types/AuthMode'
import { convertContactToRequestBody } from './contactRequestBody'

const updateContactMutator = createNftfiApiMutator<ApiContactDto, AuthMode.Required>({
  authMode: AuthMode.Required,
  method: HttpMethod.PUT,
})

export async function updateContact(
  walletAddress: Address,
  contactId: string,
  contact: Omit<Contact, 'contactId' | 'createdAt'>,
  deps: NftfiApiMutatorDependencies<AuthMode.Required>
): Promise<Contact> {
  const response = await updateContactMutator({
    url: `/v1/accounts/${walletAddress}/contacts/${contactId}`,
    body: convertContactToRequestBody(contact),
  }, deps)
  return convertApiContactToContact(response, new Map())
}
