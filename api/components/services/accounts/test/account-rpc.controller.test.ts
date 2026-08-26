import { Test } from '@nestjs/testing';
import { AccountRpcController } from '../src/account/account-rpc.controller';
import { AccountService } from '../src/account/account.service';

describe(AccountRpcController.name, () => {
  let controller: AccountRpcController;
  let accountService: AccountService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [AccountRpcController],
      providers: [
        {
          provide: AccountService,
          useValue: {
            getAccountWithEmail: jest.fn(),
            toDto: jest.fn()
          }
        }
      ]
    }).compile();

    controller = moduleRef.get(AccountRpcController);
    accountService = moduleRef.get(AccountService);
  });

  describe(AccountRpcController.prototype.getAccountWithEmail.name, () => {
    it('returns account dto when account with email exists', async () => {
      const account = {
        id: 1,
        wallet: '0x1234567890abcdef1234567890abcdef12345678',
        email: 'user@nftfi.com',
        username: 'testuser',
        comms: { refi: 'daily', maturity: 'daily', liquidity: 'daily' },
        socials: {},
        contacts: [],
        message: null,
        signedMessage: null,
        lastSignedAt: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      };
      const dto = {
        wallet: '0x1234567890abcdef1234567890abcdef12345678',
        email: 'user@nftfi.com',
        username: 'testuser',
        socials: {},
        communications: {
          refi: { frequency: 'daily' },
          maturity: { frequency: 'daily' },
          liquidity: { frequency: 'daily' }
        }
      };

      jest.spyOn(accountService, 'getAccountWithEmail').mockResolvedValue(account as never);
      jest.spyOn(accountService, 'toDto').mockReturnValue(dto as never);

      const result = await controller.getAccountWithEmail({ wallet: '0x1234567890abcdef1234567890abcdef12345678' });

      expect(result).toEqual({
        data: {
          wallet: '0x1234567890abcdef1234567890abcdef12345678',
          email: 'user@nftfi.com',
          username: 'testuser',
          socials: {},
          communications: {
            refi: { frequency: 'daily' },
            maturity: { frequency: 'daily' },
            liquidity: { frequency: 'daily' }
          }
        }
      });
      expect(accountService.getAccountWithEmail).toHaveBeenCalledWith('0x1234567890abcdef1234567890abcdef12345678');
      expect(accountService.toDto).toHaveBeenCalledWith(account);
    });

    it('returns null data when account has no email', async () => {
      jest.spyOn(accountService, 'getAccountWithEmail').mockResolvedValue(null);
      jest.spyOn(accountService, 'toDto').mockReturnValue(null);

      const result = await controller.getAccountWithEmail({ wallet: '0xdeadbeef' });

      expect(result).toEqual({ data: null });
      expect(accountService.getAccountWithEmail).toHaveBeenCalledWith('0xdeadbeef');
      expect(accountService.toDto).toHaveBeenCalledWith(null);
    });
  });
});
