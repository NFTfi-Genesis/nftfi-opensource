import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Account, AccountContact, AccountRepository, CommsFrequency } from '@nftfi.api/repositories/postgres/account';
import { createTypeormRepositoryMock, MockTypeormRepository } from '../factories';

const buildAccount = (overrides: Partial<Account> = {}): Account =>
  ({
    id: 1,
    wallet: '0x1234567890abcdef1234567890abcdef12345678',
    email: 'user@nftfi.com',
    username: 'testuser',
    comms: {
      refi: CommsFrequency.Daily,
      maturity: CommsFrequency.Weekly,
      liquidity: CommsFrequency.Never
    },
    socials: { x: '@nftfi', discord: 'nftfi#0000' },
    contacts: [],
    message: null,
    signedMessage: null,
    lastSignedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides
  } as Account);

const buildContact = (overrides: Partial<AccountContact> = {}): AccountContact =>
  ({
    id: 1,
    wallets: ['0xaaaa000000000000000000000000000000000000'],
    favourited: false,
    name: 'Contact',
    notes: 'Some notes',
    socials: {},
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides
  } as AccountContact);

describe(AccountRepository.name, () => {
  let repository: AccountRepository;
  let accountModel: MockTypeormRepository<Account>;
  let contactModel: MockTypeormRepository<AccountContact> & { delete: jest.Mock };

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AccountRepository,
        {
          provide: getRepositoryToken(Account),
          useValue: createTypeormRepositoryMock<Account>()
        },
        {
          provide: getRepositoryToken(AccountContact),
          useValue: createTypeormRepositoryMock<AccountContact>({ delete: jest.fn() } as never)
        }
      ]
    }).compile();

    repository = moduleRef.get(AccountRepository);
    accountModel = moduleRef.get(getRepositoryToken(Account));
    contactModel = moduleRef.get(getRepositoryToken(AccountContact));
  });

  describe(AccountRepository.prototype.findByWallet.name, () => {
    it('should find an account by wallet with contacts relation', async () => {
      const account = buildAccount();
      accountModel.findOne.mockResolvedValue(account);

      const result = await repository.findByWallet('0x1234567890abcdef1234567890abcdef12345678');

      expect(result).toBe(account);
      expect(accountModel.findOne).toHaveBeenCalledWith({
        where: { wallet: '0x1234567890abcdef1234567890abcdef12345678' },
        relations: { contacts: true }
      });
    });

    it('should return null when account is not found', async () => {
      accountModel.findOne.mockResolvedValue(null);

      const result = await repository.findByWallet('0xdeadbeef');

      expect(result).toBeNull();
    });
  });

  describe(AccountRepository.prototype.setAccountSignedTerms.name, () => {
    it('should update existing account with signed terms', async () => {
      const existingAccount = buildAccount();
      accountModel.findOne.mockResolvedValue(existingAccount);
      accountModel.save.mockResolvedValue({ ...existingAccount, message: 'msg', signedMessage: 'sig' } as Account);

      const result = await repository.setAccountSignedTerms({
        wallet: '0x1234567890abcdef1234567890abcdef12345678',
        message: 'msg',
        signedMessage: 'sig'
      });

      expect(accountModel.save).toHaveBeenCalledWith(
        expect.objectContaining({
          wallet: '0x1234567890abcdef1234567890abcdef12345678',
          message: 'msg',
          signedMessage: 'sig',
          lastSignedAt: expect.any(Date)
        })
      );
      expect(result.message).toBe('msg');
    });

    it('should create a new account when wallet does not exist', async () => {
      accountModel.findOne.mockResolvedValue(null);
      const newAccount = buildAccount({ message: 'msg', signedMessage: 'sig' });
      accountModel.create.mockReturnValue(newAccount);
      accountModel.save.mockResolvedValue(newAccount);

      await repository.setAccountSignedTerms({
        wallet: '0xnewwallet',
        message: 'msg',
        signedMessage: 'sig'
      });

      expect(accountModel.create).toHaveBeenCalledWith({
        wallet: '0xnewwallet',
        email: null,
        username: null,
        message: 'msg',
        signedMessage: 'sig',
        lastSignedAt: expect.any(Date)
      });
      expect(accountModel.save).toHaveBeenCalledWith(newAccount);
    });
  });

  describe(AccountRepository.prototype.updateAccount.name, () => {
    it('should return null when account is not found', async () => {
      accountModel.findOne.mockResolvedValue(null);

      const result = await repository.updateAccount({
        wallet: '0xnonexistent',
        email: 'new@nftfi.com'
      });

      expect(result).toBeNull();
      expect(accountModel.save).not.toHaveBeenCalled();
    });

    it('should update email when provided', async () => {
      const account = buildAccount();
      accountModel.findOne.mockResolvedValue(account);
      accountModel.save.mockImplementation(async a => a as Account);

      const result = await repository.updateAccount({
        wallet: '0x1234567890abcdef1234567890abcdef12345678',
        email: 'NEW@NFTFI.COM'
      });

      expect(result!.email).toBe('new@nftfi.com');
    });

    it('should set email to null when empty string is provided', async () => {
      const account = buildAccount({ email: 'old@nftfi.com' });
      accountModel.findOne.mockResolvedValue(account);
      accountModel.save.mockImplementation(async a => a as Account);

      const result = await repository.updateAccount({
        wallet: '0x1234567890abcdef1234567890abcdef12345678',
        email: ''
      });

      expect(result!.email).toBeNull();
    });

    it('should not modify email when email is undefined', async () => {
      const account = buildAccount({ email: 'keep@nftfi.com' });
      accountModel.findOne.mockResolvedValue(account);
      accountModel.save.mockImplementation(async a => a as Account);

      const result = await repository.updateAccount({
        wallet: '0x1234567890abcdef1234567890abcdef12345678'
      });

      expect(result!.email).toBe('keep@nftfi.com');
    });

    it('should update username when provided', async () => {
      const account = buildAccount();
      accountModel.findOne.mockResolvedValue(account);
      accountModel.save.mockImplementation(async a => a as Account);

      const result = await repository.updateAccount({
        wallet: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'newname'
      });

      expect(result!.username).toBe('newname');
    });

    it('should not modify username when undefined', async () => {
      const account = buildAccount({ username: 'keep' });
      accountModel.findOne.mockResolvedValue(account);
      accountModel.save.mockImplementation(async a => a as Account);

      const result = await repository.updateAccount({
        wallet: '0x1234567890abcdef1234567890abcdef12345678'
      });

      expect(result!.username).toBe('keep');
    });

    it('should merge socials when provided', async () => {
      const account = buildAccount({ socials: { x: '@old' } as Account['socials'] });
      accountModel.findOne.mockResolvedValue(account);
      accountModel.save.mockImplementation(async a => a as Account);

      const result = await repository.updateAccount({
        wallet: '0x1234567890abcdef1234567890abcdef12345678',
        socials: { discord: 'new#1234' } as Account['socials']
      });

      expect(result!.socials).toEqual({ x: '@old', discord: 'new#1234' });
    });

    it('should merge socials with null existing socials', async () => {
      const account = buildAccount({ socials: null as never });
      accountModel.findOne.mockResolvedValue(account);
      accountModel.save.mockImplementation(async a => a as Account);

      const result = await repository.updateAccount({
        wallet: '0x1234567890abcdef1234567890abcdef12345678',
        socials: { x: '@new' } as Account['socials']
      });

      expect(result!.socials).toEqual({ x: '@new' });
    });

    it('should merge comms when provided', async () => {
      const account = buildAccount({
        comms: { refi: CommsFrequency.Daily, maturity: CommsFrequency.Weekly, liquidity: CommsFrequency.Never }
      });
      accountModel.findOne.mockResolvedValue(account);
      accountModel.save.mockImplementation(async a => a as Account);

      const result = await repository.updateAccount({
        wallet: '0x1234567890abcdef1234567890abcdef12345678',
        comms: { refi: CommsFrequency.Never }
      });

      expect(result!.comms).toEqual({
        refi: 'never',
        maturity: 'weekly',
        liquidity: 'never'
      });
    });

    it('should merge comms with null existing comms', async () => {
      const account = buildAccount({ comms: null as never });
      accountModel.findOne.mockResolvedValue(account);
      accountModel.save.mockImplementation(async a => a as Account);

      const result = await repository.updateAccount({
        wallet: '0x1234567890abcdef1234567890abcdef12345678',
        comms: { maturity: CommsFrequency.Daily }
      });

      expect(result!.comms).toEqual({ maturity: 'daily' });
    });

    it('should save the updated account', async () => {
      const account = buildAccount();
      accountModel.findOne.mockResolvedValue(account);
      accountModel.save.mockImplementation(async a => a as Account);

      await repository.updateAccount({
        wallet: '0x1234567890abcdef1234567890abcdef12345678',
        email: 'test@nftfi.com'
      });

      expect(accountModel.save).toHaveBeenCalledTimes(1);
    });
  });

  describe(AccountRepository.prototype.addContact.name, () => {
    it('should create and save a new contact', async () => {
      const account = buildAccount();
      const contact = buildContact();
      const data = {
        wallets: ['0xaaaa000000000000000000000000000000000000'],
        favourited: false,
        name: 'Contact',
        notes: 'Some notes',
        socials: {}
      };
      contactModel.create.mockReturnValue(contact);
      contactModel.save.mockResolvedValue(contact);

      const result = await repository.addContact(account, data as never);

      expect(contactModel.create).toHaveBeenCalledWith({ ...data, account });
      expect(contactModel.save).toHaveBeenCalledWith(contact);
      expect(result.id).toBe(1);
    });
  });

  describe(AccountRepository.prototype.updateContact.name, () => {
    it('should save merged contact with account', async () => {
      const account = buildAccount();
      const contact = buildContact({ id: 5 });
      const data = {
        wallets: ['0xbbbb000000000000000000000000000000000000'],
        favourited: true,
        name: 'Updated',
        notes: null,
        socials: {}
      };
      const updated = buildContact({
        id: 5,
        wallets: ['0xbbbb000000000000000000000000000000000000'],
        favourited: true,
        name: 'Updated'
      });
      contactModel.save.mockResolvedValue(updated);

      const result = await repository.updateContact(account, contact, data as never);

      expect(contactModel.save).toHaveBeenCalledWith({ ...contact, ...data, account });
      expect(result.id).toBe(5);
      expect(result.name).toBe('Updated');
    });
  });

  describe(AccountRepository.prototype.deleteContact.name, () => {
    it('should delete contact by id and account id', async () => {
      const account = buildAccount({ id: 10 });
      const contact = buildContact({ id: 7 });
      contactModel.delete.mockResolvedValue({ affected: 1 });

      await repository.deleteContact(account, contact);

      expect(contactModel.delete).toHaveBeenCalledWith({ id: 7, account: { id: 10 } });
    });
  });
});
