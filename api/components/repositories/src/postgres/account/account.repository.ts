import { isUndefined } from 'lodash';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository as RepositoryType } from 'typeorm';
import { Account } from './account.entity';
import { AccountContact } from './account-contact.entity';
import { DraftAccount, SetSignedTermsPayload, UpdateAccountPayload } from './account.types';

@Injectable()
export class AccountRepository {
  constructor(
    @InjectRepository(Account) private readonly model: RepositoryType<Account>,
    @InjectRepository(AccountContact) private readonly contactModel: RepositoryType<AccountContact>
  ) {}

  async findByWallet(wallet: string): Promise<Account | null> {
    return this.model.findOne({ where: { wallet }, relations: { contacts: true } });
  }

  async setAccountSignedTerms({ wallet, message, signedMessage }: SetSignedTermsPayload): Promise<Account> {
    const existingAccount = await this.findByWallet(wallet);
    if (existingAccount) {
      return this.model.save({
        ...existingAccount,
        message,
        signedMessage,
        lastSignedAt: new Date()
      });
    }

    const account = this.model.create({
      wallet,
      email: null,
      username: null,
      message,
      signedMessage,
      lastSignedAt: new Date()
    });

    return this.model.save(account);
  }

  async updateAccount({ wallet, email, username, socials, comms }: UpdateAccountPayload): Promise<Account | null> {
    const account = await this.findByWallet(wallet);
    if (!account) {
      return null;
    }

    const nextAccount: Account = { ...account };
    if (!isUndefined(email)) {
      nextAccount.email = email ? email.toLowerCase() : null;
    }
    if (!isUndefined(username)) {
      nextAccount.username = username;
    }
    if (!isUndefined(socials)) {
      nextAccount.socials = { ...(account.socials ?? {}), ...socials };
    }
    if (!isUndefined(comms)) {
      nextAccount.comms = { ...(account.comms ?? {}), ...comms } as Account['comms'];
    }

    return this.model.save(nextAccount);
  }

  async addContact(account: Account, data: DraftAccount): Promise<AccountContact> {
    const contact = this.contactModel.create({ ...data, account });
    return this.contactModel.save(contact);
  }

  async updateContact(account: Account, contact: AccountContact, data: DraftAccount): Promise<AccountContact> {
    return this.contactModel.save({ ...contact, ...data, account });
  }

  async deleteContact(account: Account, contact: AccountContact): Promise<void> {
    await this.contactModel.delete({ id: contact.id, account: { id: account.id } });
  }
}
