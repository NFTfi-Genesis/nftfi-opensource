import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AccountPipe, AccountPipeParams } from '../src/account/account.pipe';
import { AccountService } from '../src/account/account.service';
import { buildAccount } from './factories';

describe(AccountPipe.name, () => {
  let pipe: AccountPipe;
  let accountService: AccountService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountPipe,
        {
          provide: AccountService,
          useValue: {
            getByWallet: jest.fn()
          }
        }
      ]
    }).compile();

    pipe = module.get<AccountPipe>(AccountPipe);
    accountService = module.get<AccountService>(AccountService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe(AccountPipe.prototype.transform.name, () => {
    const validAddress = '0x1234567890123456789012345678901234567890';

    it('should successfully transform params with valid address', async () => {
      const params: AccountPipeParams = { address: validAddress };
      const mockAccount = buildAccount({ wallet: validAddress });

      jest.spyOn(accountService, 'getByWallet').mockResolvedValue(mockAccount);

      const result = await pipe.transform(params);

      expect(result).toBe(mockAccount);
      expect(accountService.getByWallet).toHaveBeenCalledWith('0x1234567890123456789012345678901234567890');
      expect(accountService.getByWallet).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException when address is undefined', async () => {
      const params: AccountPipeParams = { address: undefined };

      await expect(pipe.transform(params)).rejects.toThrow(new BadRequestException('Address is required'));
      expect(accountService.getByWallet).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when address is empty string', async () => {
      const params: AccountPipeParams = { address: '' };

      await expect(pipe.transform(params)).rejects.toThrow(new BadRequestException('Address is required'));
      expect(accountService.getByWallet).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when params object has no address property', async () => {
      const params: AccountPipeParams = {};

      await expect(pipe.transform(params)).rejects.toThrow(new BadRequestException('Address is required'));
      expect(accountService.getByWallet).not.toHaveBeenCalled();
    });

    it('should propagate NotFoundException from AccountService', async () => {
      const params: AccountPipeParams = { address: validAddress };
      const notFoundError = new NotFoundException('Account 0x1234567890123456789012345678901234567890 not found');

      jest.spyOn(accountService, 'getByWallet').mockRejectedValue(notFoundError);

      await expect(pipe.transform(params)).rejects.toThrow(notFoundError);
      expect(accountService.getByWallet).toHaveBeenCalledWith('0x1234567890123456789012345678901234567890');
      expect(accountService.getByWallet).toHaveBeenCalledTimes(1);
    });

    it('should propagate any other errors from AccountService', async () => {
      const params: AccountPipeParams = { address: validAddress };
      const genericError = new Error('Database connection failed');

      jest.spyOn(accountService, 'getByWallet').mockRejectedValue(genericError);

      await expect(pipe.transform(params)).rejects.toThrow(genericError);
      expect(accountService.getByWallet).toHaveBeenCalledWith('0x1234567890123456789012345678901234567890');
      expect(accountService.getByWallet).toHaveBeenCalledTimes(1);
    });

    it('should handle different valid address formats', async () => {
      const checksumAddress = '0xAbC1234567890123456789012345678901234567890';
      const params: AccountPipeParams = { address: checksumAddress };
      const mockAccount = buildAccount({ wallet: checksumAddress });

      jest.spyOn(accountService, 'getByWallet').mockResolvedValue(mockAccount);

      const result = await pipe.transform(params);

      expect(result).toBe(mockAccount);
      expect(accountService.getByWallet).toHaveBeenCalledWith('0xAbC1234567890123456789012345678901234567890');
    });
  });
});
