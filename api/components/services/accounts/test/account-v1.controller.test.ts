import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Reflector } from '@nestjs/core';
import { AccountRepository, CommsFrequency } from '@nftfi.api/repositories/postgres/account';
import { AuthGuard, AuthParamGuard, AuthService } from '@nftfi.api/modules/auth-guard';
import { ChainalysisFacade } from '@nftfi.api/facades/chainalysis';
import { AccountV1Controller } from '../src/account/account-v1.controller';
import { AccountService } from '../src/account/account.service';
import { AccountPipe } from '../src/account/account.pipe';
import { buildAccount } from './factories';

describe(`${AccountV1Controller.name} (e2e)`, () => {
  let app: INestApplication;
  let accountRepository: jest.Mocked<AccountRepository>;
  let chainalysisFacade: jest.Mocked<ChainalysisFacade>;
  const address = '0x1234567890abcdef1234567890abcdef12345678';

  beforeEach(async () => {
    jest.resetAllMocks();

    const mockAccountRepository = {
      findByWallet: jest.fn(),
      updateAccount: jest.fn()
    };

    const mockChainalysisFacade = {
      getIdentifications: jest.fn()
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AccountV1Controller],
      providers: [
        AccountService,
        AccountPipe,
        Reflector,
        {
          provide: AccountRepository,
          useValue: mockAccountRepository
        },
        {
          provide: ChainalysisFacade,
          useValue: mockChainalysisFacade
        },
        {
          provide: AuthService,
          useValue: {
            verifyToken: jest.fn().mockResolvedValue({ account: address }),
            isTokenOwner: jest.fn().mockReturnValue(true)
          }
        }
      ]
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthParamGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    accountRepository = moduleFixture.get(AccountRepository);
    chainalysisFacade = moduleFixture.get(ChainalysisFacade);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /v1/accounts/:address', () => {
    it('should return account DTO for existing account', async () => {
      const account = buildAccount({
        wallet: address,
        email: 'user@nftfi.com',
        username: 'testuser',
        socials: { x: '@nftfi', discord: 'nftfi#0000', telegram: '' },
        comms: {
          refi: CommsFrequency.Daily,
          maturity: CommsFrequency.Weekly,
          liquidity: CommsFrequency.Never
        }
      });
      accountRepository.findByWallet.mockResolvedValue(account);

      const response = await request(app.getHttpServer()).get(`/v1/accounts/${address}`).expect(200);

      expect(response.body.wallet).toBe('0x1234567890abcdef1234567890abcdef12345678');
      expect(response.body.email).toBe('user@nftfi.com');
      expect(response.body.username).toBe('testuser');
      expect(response.body.communications.refi.frequency).toBe('daily');
      expect(response.body.communications.maturity.frequency).toBe('weekly');
      expect(response.body.communications.liquidity.frequency).toBe('never');
    });

    it('should return 404 when account not found', async () => {
      accountRepository.findByWallet.mockResolvedValue(null);

      await request(app.getHttpServer()).get(`/v1/accounts/${address}`).expect(404);
    });
  });

  describe('PATCH /v1/accounts/:address', () => {
    it('should update account and return DTO', async () => {
      const account = buildAccount({ wallet: address });
      const updatedAccount = buildAccount({ wallet: address, email: 'new@nftfi.com' });
      accountRepository.findByWallet.mockResolvedValue(account);
      accountRepository.updateAccount.mockResolvedValue(updatedAccount);

      const response = await request(app.getHttpServer())
        .patch(`/v1/accounts/${address}`)
        .send({ email: 'new@nftfi.com' })
        .expect(200);

      expect(response.body.email).toBe('new@nftfi.com');
      expect(accountRepository.updateAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          wallet: '0x1234567890abcdef1234567890abcdef12345678',
          email: 'new@nftfi.com'
        })
      );
    });

    it('should return 404 when account not found for update', async () => {
      accountRepository.findByWallet.mockResolvedValue(null);

      await request(app.getHttpServer()).patch(`/v1/accounts/${address}`).send({ email: 'new@nftfi.com' }).expect(404);
    });
  });

  describe('GET /v1/accounts/:address/sanctioned', () => {
    it('should return sanctioned status as true when flagged', async () => {
      chainalysisFacade.getIdentifications.mockResolvedValue([{}]);

      const response = await request(app.getHttpServer()).get(`/v1/accounts/${address}/sanctioned`).expect(200);

      expect(response.body.wallet).toBe('0x1234567890abcdef1234567890abcdef12345678');
      expect(response.body.flagged).toBe(true);
    });

    it('should return sanctioned status as false when not flagged', async () => {
      chainalysisFacade.getIdentifications.mockResolvedValue([]);

      const response = await request(app.getHttpServer()).get(`/v1/accounts/${address}/sanctioned`).expect(200);

      expect(response.body.wallet).toBe('0x1234567890abcdef1234567890abcdef12345678');
      expect(response.body.flagged).toBe(false);
    });
  });
});
