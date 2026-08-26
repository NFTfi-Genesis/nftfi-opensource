import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { type Account, AccountContact, AccountRepository, SocialType } from '@nftfi.api/repositories/postgres/account';
import { ContactDto, DraftContactDto } from '@nftfi.api/facades/accounts/dtos';

@Injectable()
export class ContactService {
  constructor(private readonly accountRepository: AccountRepository) {}

  async getByAccount(account: Account): Promise<AccountContact[]> {
    const contacts = account.contacts;
    return contacts;
  }

  async create(account: Account, draftContact: DraftContactDto): Promise<AccountContact> {
    const entity = await this.accountRepository.addContact(account, {
      wallets: draftContact.wallets,
      favourited: draftContact.favourited,
      name: draftContact.name ?? null,
      notes: draftContact.notes ?? null,
      socials: draftContact.socials as Record<SocialType, string>
    });
    return entity;
  }

  async update(account: Account, contact: AccountContact, draftContact: DraftContactDto): Promise<AccountContact> {
    const updatedContact = await this.accountRepository.updateContact(account, contact, {
      wallets: draftContact.wallets,
      favourited: draftContact.favourited,
      name: draftContact.name ?? null,
      notes: draftContact.notes ?? null,
      socials: draftContact.socials as Record<SocialType, string>
    });
    return updatedContact;
  }

  async delete(account: Account, contact: AccountContact): Promise<void> {
    await this.accountRepository.deleteContact(account, contact);
  }

  toDto(accountContact: AccountContact): ContactDto {
    return plainToInstance(ContactDto, {
      id: accountContact.id,
      wallets: accountContact.wallets,
      favourited: accountContact.favourited,
      name: accountContact.name ?? undefined,
      notes: accountContact.notes ?? undefined,
      socials: accountContact.socials as ContactDto['socials'],
      createdAt: accountContact.createdAt
    });
  }
}
