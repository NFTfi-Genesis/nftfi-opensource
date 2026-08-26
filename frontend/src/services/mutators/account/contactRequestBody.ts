import { Address } from 'src/entities/base/Address'
import { Contact } from 'src/entities/domain/Contact'

export type ApiContactRequestBody = {
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

export function convertContactToRequestBody(
  contact: Omit<Contact, 'contactId' | 'createdAt'>
): ApiContactRequestBody {
  return {
    wallets: contact.addresses
      .filter(addr => addr.value)
      .map(addr => addr.value),
    favourited: !!contact.isFavourite,
    name: contact.name,
    notes: contact.notes,
    socials: {
      x: contact.xHandle,
      telegram: contact.telegramHandle,
      discord: contact.discordHandle,
      email: contact.email,
    },
  }
}
