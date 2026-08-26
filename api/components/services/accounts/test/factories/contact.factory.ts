import {
  type Account,
  type AccountContact,
  CommsFrequency,
  SocialType
} from '@nftfi.api/repositories/postgres/account';
import { DraftContactDto } from '@nftfi.api/facades/accounts/dtos';

type AccountContactFactoryOptions = Partial<Omit<AccountContact, 'account'>>;

type DraftContactFactoryOptions = Partial<DraftContactDto>;

export function buildAccountContact(options: AccountContactFactoryOptions = {}): AccountContact {
  return {
    id: options.id ?? 1,
    wallets: options.wallets ?? ['0x1234567890123456789012345678901234567890'],
    favourited: options.favourited ?? false,
    name: options.name ?? 'Test Contact',
    notes: options.notes ?? 'Test contact notes',
    socials: options.socials ?? {
      [SocialType.X]: 'test_user',
      [SocialType.Email]: 'test@example.com',
      [SocialType.Discord]: 'testuser#1234',
      [SocialType.Telegram]: '@testuser'
    },
    createdAt: options.createdAt ?? new Date(),
    updatedAt: options.updatedAt ?? new Date()
  } as AccountContact;
}

export function buildDraftContact(options: DraftContactFactoryOptions = {}): DraftContactDto {
  return {
    wallets: options.wallets ?? ['0x1234567890123456789012345678901234567890'],
    favourited: options.favourited ?? false,
    name: options.name ?? 'Test Contact',
    notes: options.notes ?? 'Test contact notes',
    socials: options.socials ?? {
      x: 'test_user',
      email: 'test@example.com',
      discord: 'testuser#1234',
      telegram: '@testuser'
    }
  } as DraftContactDto;
}

export function buildAccount(
  options: Partial<Omit<Account, 'contacts'>> & { contacts?: AccountContact[] } = {}
): Account {
  return {
    id: options.id ?? 1,
    wallet: options.wallet ?? '0x1234567890123456789012345678901234567890',
    email: options.email ?? null,
    username: options.username ?? null,
    contacts: options.contacts ?? [],
    comms: options.comms ?? {
      refi: CommsFrequency.Daily,
      maturity: CommsFrequency.Daily,
      liquidity: CommsFrequency.Daily
    },
    socials: options.socials ?? {},
    message: options.message ?? null,
    signedMessage: options.signedMessage ?? null,
    lastSignedAt: options.lastSignedAt ?? null,
    createdAt: options.createdAt ?? new Date(),
    updatedAt: options.updatedAt ?? new Date()
  } as Account;
}
