import { Test, TestingModule } from '@nestjs/testing';
import { AccountRepository, SocialType } from '@nftfi.api/repositories/postgres/account';
import { DraftContactDto } from '@nftfi.api/facades/accounts/dtos';
import { ContactService } from '../src/account/contact.service';
import { buildAccountContact, buildDraftContact, buildAccount } from './factories';

describe(ContactService.name, () => {
  let service: ContactService;
  let accountRepository: AccountRepository;
  const testDate = new Date('2024-01-01T00:00:00.000Z');

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(testDate);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactService,
        {
          provide: AccountRepository,
          useValue: {
            addContact: jest.fn(),
            updateContact: jest.fn(),
            deleteContact: jest.fn()
          }
        }
      ]
    }).compile();

    service = module.get<ContactService>(ContactService);
    accountRepository = module.get<AccountRepository>(AccountRepository);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe(ContactService.prototype.getByAccount.name, () => {
    it('should return empty array when account has no contacts', async () => {
      const account = buildAccount({ contacts: [] });

      const result = await service.getByAccount(account);

      expect(result).toEqual([]);
    });

    it('should return contacts when account has contacts', async () => {
      const contacts = [
        buildAccountContact({ id: 1, createdAt: testDate }),
        buildAccountContact({ id: 2, createdAt: testDate })
      ];
      const account = buildAccount({ contacts });

      const result = await service.getByAccount(account);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });
  });

  describe(ContactService.prototype.create.name, () => {
    it('should create a new contact successfully', async () => {
      const draftContact = buildDraftContact({
        name: 'Test Contact',
        wallets: ['0x1234567890123456789012345678901234567890'],
        favourited: false
      });
      const mockAccount = buildAccount();
      const mockContact = buildAccountContact({
        id: 1,
        name: 'Test Contact',
        wallets: ['0x1234567890123456789012345678901234567890'],
        favourited: false,
        createdAt: testDate
      });

      jest.spyOn(accountRepository, 'addContact').mockResolvedValue(mockContact);

      const result = await service.create(mockAccount, draftContact);

      expect(result.id).toBe(1);
      expect(result.name).toBe('Test Contact');
      expect(result.wallets).toEqual(['0x1234567890123456789012345678901234567890']);
      expect(result.favourited).toBe(false);

      expect(accountRepository.addContact).toHaveBeenCalledWith(
        mockAccount,
        expect.objectContaining({
          wallets: ['0x1234567890123456789012345678901234567890'],
          favourited: false,
          name: 'Test Contact'
        })
      );
    });

    it('should pass null for optional fields when not provided', async () => {
      const draftContact: DraftContactDto = {
        wallets: ['0x1234567890123456789012345678901234567890'],
        favourited: false,
        socials: {}
      };
      const mockAccount = buildAccount();
      const mockContact = buildAccountContact({ createdAt: testDate });

      jest.spyOn(accountRepository, 'addContact').mockResolvedValue(mockContact);

      await service.create(mockAccount, draftContact);

      expect(accountRepository.addContact).toHaveBeenCalledWith(
        mockAccount,
        expect.objectContaining({
          name: null,
          notes: null
        })
      );
    });
  });

  describe(ContactService.prototype.update.name, () => {
    it('should update contact successfully', async () => {
      const draftContact = buildDraftContact({
        name: 'Updated Contact',
        wallets: ['0x9876543210987654321098765432109876543210'],
        favourited: true
      });
      const existingContact = buildAccountContact({ id: 5, createdAt: testDate });
      const account = buildAccount({ contacts: [existingContact] });
      const updatedContact = buildAccountContact({
        id: 5,
        name: 'Updated Contact',
        wallets: ['0x9876543210987654321098765432109876543210'],
        favourited: true,
        createdAt: testDate
      });

      jest.spyOn(accountRepository, 'updateContact').mockResolvedValue(updatedContact);

      const result = await service.update(account, existingContact, draftContact);

      expect(result.id).toBe(5);
      expect(result.name).toBe('Updated Contact');
      expect(result.wallets).toEqual(['0x9876543210987654321098765432109876543210']);
      expect(result.favourited).toBe(true);

      expect(accountRepository.updateContact).toHaveBeenCalledWith(
        account,
        existingContact,
        expect.objectContaining({
          wallets: ['0x9876543210987654321098765432109876543210'],
          favourited: true,
          name: 'Updated Contact'
        })
      );
    });

    it('should pass null for name and notes when not provided in draft', async () => {
      const draftContact: DraftContactDto = {
        wallets: ['0x1234567890123456789012345678901234567890'],
        favourited: false,
        socials: {}
      };
      const existingContact = buildAccountContact({ id: 3, createdAt: testDate });
      const account = buildAccount({ contacts: [existingContact] });
      const updatedContact = buildAccountContact({ id: 3, createdAt: testDate });

      jest.spyOn(accountRepository, 'updateContact').mockResolvedValue(updatedContact);

      await service.update(account, existingContact, draftContact);

      expect(accountRepository.updateContact).toHaveBeenCalledWith(
        account,
        existingContact,
        expect.objectContaining({
          name: null,
          notes: null
        })
      );
    });
  });

  describe(ContactService.prototype.delete.name, () => {
    it('should delete contact successfully', async () => {
      const existingContact = buildAccountContact({ id: 5, createdAt: testDate });
      const account = buildAccount({ contacts: [existingContact] });

      jest.spyOn(accountRepository, 'deleteContact').mockResolvedValue(undefined);

      const result = await service.delete(account, existingContact);

      expect(result).toBeUndefined();
      expect(accountRepository.deleteContact).toHaveBeenCalledWith(account, existingContact);
    });
  });

  describe(ContactService.prototype.toDto.name, () => {
    it('should convert AccountContact entity to ContactDto', () => {
      const contact = buildAccountContact({
        id: 10,
        wallets: ['0xabc0000000000000000000000000000000000000'],
        favourited: true,
        name: 'My Friend',
        notes: 'Good lender',
        socials: {
          [SocialType.X]: 'friend_x',
          [SocialType.Email]: 'friend@test.com',
          [SocialType.Discord]: 'friend#0001',
          [SocialType.Telegram]: '@friend'
        },
        createdAt: testDate
      });

      const dto = service.toDto(contact);

      expect(dto.id).toBe(10);
      expect(dto.wallets).toEqual(['0xabc0000000000000000000000000000000000000']);
      expect(dto.favourited).toBe(true);
      expect(dto.name).toBe('My Friend');
      expect(dto.notes).toBe('Good lender');
      expect(dto.createdAt).toEqual(testDate);
    });

    it('should convert null name and notes to undefined in DTO', () => {
      const contact = { ...buildAccountContact(), name: null, notes: null };

      const dto = service.toDto(contact);

      expect(dto.name).toBeUndefined();
      expect(dto.notes).toBeUndefined();
    });
  });
});
