import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AccountContactPipe, AccountContactPipeParams, AccountContactTuple } from '../src/account/account-contact.pipe';
import { AccountService } from '../src/account/account.service';
import { buildAccount, buildAccountContact } from './factories';

describe(AccountContactPipe.name, () => {
  let pipe: AccountContactPipe;
  let accountService: AccountService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountContactPipe,
        {
          provide: AccountService,
          useValue: {
            getByWallet: jest.fn()
          }
        }
      ]
    }).compile();

    pipe = module.get<AccountContactPipe>(AccountContactPipe);
    accountService = module.get<AccountService>(AccountService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe(AccountContactPipe.prototype.transform.name, () => {
    const validAddress = '0x1234567890123456789012345678901234567890';
    const validContactId = '1';

    describe('successful transformations', () => {
      it('should successfully transform params with valid address and contactId', async () => {
        const contact = buildAccountContact({ id: 1 });
        const account = buildAccount({
          wallet: validAddress,
          contacts: [contact]
        });
        const params: AccountContactPipeParams = {
          address: validAddress,
          contactId: validContactId
        };

        jest.spyOn(accountService, 'getByWallet').mockResolvedValue(account);

        const result: AccountContactTuple = await pipe.transform(params);

        expect(result).toEqual([account, contact]);
        expect(result[0]).toBe(account);
        expect(result[1]).toBe(contact);
        expect(accountService.getByWallet).toHaveBeenCalledWith('0x1234567890123456789012345678901234567890');
        expect(accountService.getByWallet).toHaveBeenCalledTimes(1);
      });

      it('should find contact among multiple contacts', async () => {
        const contact1 = buildAccountContact({ id: 1 });
        const contact2 = buildAccountContact({ id: 2 });
        const contact3 = buildAccountContact({ id: 3 });
        const account = buildAccount({
          wallet: validAddress,
          contacts: [contact1, contact2, contact3]
        });
        const params: AccountContactPipeParams = {
          address: validAddress,
          contactId: '2'
        };

        jest.spyOn(accountService, 'getByWallet').mockResolvedValue(account);

        const result: AccountContactTuple = await pipe.transform(params);

        expect(result).toEqual([account, contact2]);
        expect(result[1].id).toBe(2);
      });
    });

    describe('validation errors', () => {
      it('should throw BadRequestException when address is falsy', async () => {
        const params = {
          address: '',
          contactId: validContactId
        } as AccountContactPipeParams;

        await expect(pipe.transform(params)).rejects.toThrow(
          new BadRequestException('Address and contactId are required')
        );
        expect(accountService.getByWallet).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when contactId is falsy', async () => {
        const params = {
          address: validAddress,
          contactId: ''
        } as AccountContactPipeParams;

        await expect(pipe.transform(params)).rejects.toThrow(
          new BadRequestException('Address and contactId are required')
        );
        expect(accountService.getByWallet).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when contactId is not a number', async () => {
        const params: AccountContactPipeParams = {
          address: validAddress,
          contactId: 'abc'
        };

        jest.spyOn(accountService, 'getByWallet').mockResolvedValue(buildAccount({ wallet: validAddress }));

        await expect(pipe.transform(params)).rejects.toThrow(new BadRequestException('contactId must be a number'));
      });
    });

    describe('contact not found scenarios', () => {
      it('should throw NotFoundException when contact does not exist in account', async () => {
        const existingContact = buildAccountContact({ id: 99 });
        const account = buildAccount({
          wallet: validAddress,
          contacts: [existingContact]
        });
        const params: AccountContactPipeParams = {
          address: validAddress,
          contactId: validContactId
        };

        jest.spyOn(accountService, 'getByWallet').mockResolvedValue(account);

        await expect(pipe.transform(params)).rejects.toThrow(new NotFoundException('Contact 1 not found'));
        expect(accountService.getByWallet).toHaveBeenCalledWith('0x1234567890123456789012345678901234567890');
        expect(accountService.getByWallet).toHaveBeenCalledTimes(1);
      });

      it('should throw NotFoundException when account has no contacts', async () => {
        const account = buildAccount({
          wallet: validAddress,
          contacts: []
        });
        const params: AccountContactPipeParams = {
          address: validAddress,
          contactId: validContactId
        };

        jest.spyOn(accountService, 'getByWallet').mockResolvedValue(account);

        await expect(pipe.transform(params)).rejects.toThrow(new NotFoundException('Contact 1 not found'));
        expect(accountService.getByWallet).toHaveBeenCalledWith('0x1234567890123456789012345678901234567890');
      });
    });

    describe('AccountService error propagation', () => {
      it('should propagate NotFoundException from AccountService', async () => {
        const params: AccountContactPipeParams = {
          address: validAddress,
          contactId: validContactId
        };
        const notFoundError = new NotFoundException('Account 0x1234567890123456789012345678901234567890 not found');

        jest.spyOn(accountService, 'getByWallet').mockRejectedValue(notFoundError);

        await expect(pipe.transform(params)).rejects.toThrow(notFoundError);
        expect(accountService.getByWallet).toHaveBeenCalledWith('0x1234567890123456789012345678901234567890');
        expect(accountService.getByWallet).toHaveBeenCalledTimes(1);
      });

      it('should propagate any other errors from AccountService', async () => {
        const params: AccountContactPipeParams = {
          address: validAddress,
          contactId: validContactId
        };
        const genericError = new Error('Database connection failed');

        jest.spyOn(accountService, 'getByWallet').mockRejectedValue(genericError);

        await expect(pipe.transform(params)).rejects.toThrow(genericError);
        expect(accountService.getByWallet).toHaveBeenCalledWith('0x1234567890123456789012345678901234567890');
        expect(accountService.getByWallet).toHaveBeenCalledTimes(1);
      });
    });
  });
});
