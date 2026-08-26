import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Account, AccountRepository, CommsFrequency } from '@nftfi.api/repositories/postgres/account';
import { ChainalysisFacade } from '@nftfi.api/facades/chainalysis';
import { AccountService } from '../src/account/account.service';

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

describe(AccountService.name, () => {
  let service: AccountService;
  let accountRepository: AccountRepository;
  let chainalysisFacade: ChainalysisFacade;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AccountService,
        {
          provide: AccountRepository,
          useValue: {
            findByWallet: jest.fn(),
            updateAccount: jest.fn()
          }
        },
        {
          provide: ChainalysisFacade,
          useValue: {
            getIdentifications: jest.fn()
          }
        }
      ]
    }).compile();

    service = moduleRef.get(AccountService);
    accountRepository = moduleRef.get(AccountRepository);
    chainalysisFacade = moduleRef.get(ChainalysisFacade);
  });

  describe(AccountService.prototype.getByWallet.name, () => {
    it('returns account when found', async () => {
      const account = buildAccount();
      jest.spyOn(accountRepository, 'findByWallet').mockResolvedValue(account);

      const result = await service.getByWallet('0x1234567890abcdef1234567890abcdef12345678');

      expect(result).toBe(account);
      expect(accountRepository.findByWallet).toHaveBeenCalledWith('0x1234567890abcdef1234567890abcdef12345678');
    });

    it('throws NotFoundException when account not found', async () => {
      jest.spyOn(accountRepository, 'findByWallet').mockResolvedValue(null);

      await expect(service.getByWallet('0xdeadbeef')).rejects.toThrow(NotFoundException);
    });
  });

  describe(AccountService.prototype.getAccountWithEmail.name, () => {
    it('returns account when it has an email', async () => {
      const account = buildAccount({ email: 'user@nftfi.com' });
      jest.spyOn(accountRepository, 'findByWallet').mockResolvedValue(account);

      const result = await service.getAccountWithEmail('0x1234567890abcdef1234567890abcdef12345678');

      expect(result).toBe(account);
    });

    it('returns null when account has no email', async () => {
      const account = buildAccount({ email: null });
      jest.spyOn(accountRepository, 'findByWallet').mockResolvedValue(account);

      const result = await service.getAccountWithEmail('0x1234567890abcdef1234567890abcdef12345678');

      expect(result).toBeNull();
    });

    it('returns null when account email is undefined', async () => {
      const account = buildAccount({ email: undefined } as never);
      jest.spyOn(accountRepository, 'findByWallet').mockResolvedValue(account);

      const result = await service.getAccountWithEmail('0x1234567890abcdef1234567890abcdef12345678');

      expect(result).toBeNull();
    });

    it('returns null when account does not exist', async () => {
      jest.spyOn(accountRepository, 'findByWallet').mockResolvedValue(null);

      const result = await service.getAccountWithEmail('0xdeadbeef');

      expect(result).toBeNull();
    });
  });

  describe(AccountService.prototype.update.name, () => {
    it('updates account with communications', async () => {
      const account = buildAccount();
      jest.spyOn(accountRepository, 'updateAccount').mockResolvedValue(account);

      const result = await service.update('0x1234567890abcdef1234567890abcdef12345678', {
        email: 'new@nftfi.com',
        communications: {
          refi: { frequency: CommsFrequency.Weekly },
          maturity: { frequency: CommsFrequency.Never }
        }
      });

      expect(result).toBe(account);
      expect(accountRepository.updateAccount).toHaveBeenCalledWith({
        wallet: '0x1234567890abcdef1234567890abcdef12345678',
        email: 'new@nftfi.com',
        username: undefined,
        socials: undefined,
        comms: {
          refi: 'weekly',
          maturity: 'never'
        }
      });
    });

    it('updates account without communications', async () => {
      const account = buildAccount();
      jest.spyOn(accountRepository, 'updateAccount').mockResolvedValue(account);

      const result = await service.update('0x1234567890abcdef1234567890abcdef12345678', {
        username: 'newname'
      });

      expect(result).toBe(account);
      expect(accountRepository.updateAccount).toHaveBeenCalledWith({
        wallet: '0x1234567890abcdef1234567890abcdef12345678',
        email: undefined,
        username: 'newname',
        socials: undefined,
        comms: undefined
      });
    });

    it('throws NotFoundException when account not found', async () => {
      jest.spyOn(accountRepository, 'updateAccount').mockResolvedValue(null);

      await expect(service.update('0xdeadbeef', { email: 'new@nftfi.com' })).rejects.toThrow(NotFoundException);
    });

    it('skips null communication entries', async () => {
      const account = buildAccount();
      jest.spyOn(accountRepository, 'updateAccount').mockResolvedValue(account);

      await service.update('0x1234567890abcdef1234567890abcdef12345678', {
        communications: {
          refi: { frequency: CommsFrequency.Daily },
          maturity: null as never
        }
      });

      expect(accountRepository.updateAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          comms: { refi: 'daily' }
        })
      );
    });
  });

  describe(AccountService.prototype.isSanctioned.name, () => {
    it('returns true when identifications exist', async () => {
      jest.spyOn(chainalysisFacade, 'getIdentifications').mockResolvedValue([{ id: '1' }] as never);

      const result = await service.isSanctioned('0x1234567890abcdef1234567890abcdef12345678');

      expect(result).toBe(true);
      expect(chainalysisFacade.getIdentifications).toHaveBeenCalledWith('0x1234567890abcdef1234567890abcdef12345678');
    });

    it('returns false when no identifications', async () => {
      jest.spyOn(chainalysisFacade, 'getIdentifications').mockResolvedValue([]);

      const result = await service.isSanctioned('0x1234567890abcdef1234567890abcdef12345678');

      expect(result).toBe(false);
    });
  });

  describe(AccountService.prototype.toDto.name, () => {
    it('converts account to dto with all fields', () => {
      const account = buildAccount();

      const result = service.toDto(account);

      expect(result).toEqual({
        wallet: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'testuser',
        email: 'user@nftfi.com',
        socials: { x: '@nftfi', discord: 'nftfi#0000' },
        communications: {
          refi: { frequency: 'daily' },
          maturity: { frequency: 'weekly' },
          liquidity: { frequency: 'never' }
        }
      });
    });

    it('returns null for null account', () => {
      expect(service.toDto(null)).toBeNull();
    });

    it('returns null for undefined account', () => {
      expect(service.toDto(undefined)).toBeNull();
    });

    it('defaults comms to daily when not set', () => {
      const account = buildAccount({ comms: {} as never });

      const result = service.toDto(account);

      expect(result!.communications).toEqual({
        refi: { frequency: 'daily' },
        maturity: { frequency: 'daily' },
        liquidity: { frequency: 'daily' }
      });
    });

    it('defaults username to null when not set', () => {
      const account = buildAccount({ username: null });

      const result = service.toDto(account);

      expect(result!.username).toBeNull();
    });

    it('defaults socials to empty object when not set', () => {
      const account = buildAccount({ socials: null as never });

      const result = service.toDto(account);

      expect(result!.socials).toEqual({});
    });

    it('defaults email to null when email is undefined', () => {
      const account = buildAccount({ email: undefined } as never);

      const result = service.toDto(account);

      expect(result!.email).toBeNull();
    });

    it('defaults comms to daily when comms is null', () => {
      const account = buildAccount({ comms: null as never });

      const result = service.toDto(account);

      expect(result!.communications).toEqual({
        refi: { frequency: 'daily' },
        maturity: { frequency: 'daily' },
        liquidity: { frequency: 'daily' }
      });
    });
  });
});
