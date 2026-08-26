import { Address } from 'src/entities/base/Address'

export type Contact = {
  contactId: string
  name: string
  addresses: {
    value: Address
    ens?: string
  }[]
  isFavourite: boolean
  xHandle: string
  email: string
  discordHandle: string
  telegramHandle: string
  notes: string
  createdAt: string
}

export enum ContactsSortType {
  Alphabetically = 'alphabetically',
  DateAdded = 'dateAdded',
}
export enum ContactsSortDirection {
  Asc = 'asc',
  Desc = 'desc',
}
