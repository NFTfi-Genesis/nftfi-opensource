import { AccountContact } from './account-contact.entity';
import { Account } from './account.entity';

export const ACCOUNT_TABLE_NAME = 'accounts';
export const ACCOUNT_CONTACT_TABLE_NAME = 'account_contacts';

export enum SocialType {
  X = 'x',
  Discord = 'discord',
  Telegram = 'telegram',
  Email = 'email'
}

export enum CommsFrequency {
  Daily = 'daily',
  Weekly = 'weekly',
  Never = 'never'
}

export type DraftAccount = Omit<AccountContact, 'id' | 'account' | 'createdAt' | 'updatedAt'>;

export type SetSignedTermsPayload = Pick<Account, 'wallet' | 'message' | 'signedMessage'>;

export type UpdateAccountPayload = Pick<Account, 'wallet'> &
  Partial<Pick<Account, 'email' | 'username' | 'socials'>> & {
    comms?: Partial<Record<'refi' | 'maturity' | 'liquidity', CommsFrequency>>;
  };
