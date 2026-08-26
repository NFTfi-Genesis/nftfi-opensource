import { Address } from 'src/entities/base/Address'
import { Contact } from 'src/entities/domain/Contact'
import { createNftfiApiFetcher, NftfiApiFetcherDependencies } from '../../factories/nftfiApi/createNftfiApiFetcher'
import { AuthMode } from '../../types/AuthMode'
import { OnChainFetcherDependencies } from '../../factories/onChain/createOnChainFetcher'
import { lookupEnsReverse } from '../ethereum/lookupEnsReverse'

export type ApiContactDto = {
  id: number
  createdAt: string
  wallets: Address[]
  favourited: boolean
  name?: string
  notes?: string
  socials?: {
    x?: string
    telegram?: string
    discord?: string
    email?: string
  }
}

const contactsFetcher = createNftfiApiFetcher<ApiContactDto[], AuthMode.Required>({
  authMode: AuthMode.Required,
})

export type GetContactsDependencies = NftfiApiFetcherDependencies<AuthMode.Required> & OnChainFetcherDependencies

export async function getContacts(walletAddress: Address, deps: GetContactsDependencies): Promise<Contact[]> {
  const response = await contactsFetcher({
    url: `/v1/accounts/${walletAddress}/contacts`,
  }, deps)

  const contacts = response || []

  const addressesFlat = Array.from(new Set(
    contacts.flatMap(contact => contact.wallets)
  ))

  const ensRecords = await Promise.all(addressesFlat.map(async address => {
    const ens = await lookupEnsReverse(address, deps)
    return {
      address,
      ens,
    }
  }))

  const addressToEnsMap = new Map<Address, string>()
  ensRecords.forEach(record => {
    if (record.ens) {
      addressToEnsMap.set(record.address, record.ens)
    }
  })

  return contacts.map(contact => convertApiContactToContact(contact, addressToEnsMap))
}

export function convertApiContactToContact(
  contact: ApiContactDto,
  addressToEnsMap: Map<Address, string>
): Contact {
  const firstAddressEns = addressToEnsMap.get(contact.wallets[0])
  return {
    contactId: String(contact.id),
    name: contact.name || firstAddressEns || contact.wallets[0]?.slice(2, 8) || '',
    addresses: contact.wallets.map(address => ({
      value: address,
      ens: addressToEnsMap.get(address) || undefined,
    })),
    isFavourite: contact.favourited,
    notes: contact.notes || '',
    xHandle: contact.socials?.x || '',
    email: contact.socials?.email || '',
    discordHandle: contact.socials?.discord || '',
    telegramHandle: contact.socials?.telegram || '',
    createdAt: contact.createdAt,
  }
}
