import { Address } from 'src/entities/base/Address'

export type Account = {
  account: Address
  username: string
  email: string
  discordUsername: string
  communications: {
    refi: AccountCommunicationsVariant
    maturity: AccountCommunicationsVariant
    liquidity: AccountCommunicationsVariant
  }
}

export type AccountCommunicationsVariant = {
  frequency: AccountCommsFrequency
}

export enum AccountCommsFrequency {
  Daily = 'daily',
  Weekly = 'weekly',
  Never = 'never',
}

export enum AccountCommsOpportunity {
  MyLoans = 'my-loans',
  AllLoans = 'all-loans',
  Never = 'never',
}
