import { AccountDto } from './dtos/account.dto';

export const ServiceToken = `AccountsFacadeToken`;
export const QueueChannel = 'accounts';

export enum AccountsQueueTopic {
  GetAccountWithEmail = `${QueueChannel}_get-account-with-email`
}

export interface GetAccountWithEmailParams {
  wallet: string;
}

export type AccountWithEmail = Omit<AccountDto, 'email'> & { email: string };
