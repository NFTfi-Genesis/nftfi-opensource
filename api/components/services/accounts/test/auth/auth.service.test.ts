import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnprocessableEntityException } from '@nestjs/common';
import { ethers } from 'ethers';
import { AccountRepository } from '@nftfi.api/repositories/postgres/account';
import { EthersFacade } from '@nftfi.api/modules/ethers-provider';
import { AuthService } from '../../src/auth/auth.service';
import { RefreshTokenStore } from '../../src/auth/refresh-token.store';

jest.mock('ethers', () => {
  const actual = jest.requireActual('ethers');
  return {
    ...actual,
    ethers: {
      ...actual.ethers,
      utils: {
        ...actual.ethers.utils,
        verifyMessage: jest.fn()
      }
    }
  };
});

const mockVerifyMessage = ethers.utils.verifyMessage as jest.MockedFunction<typeof ethers.utils.verifyMessage>;

describe(AuthService.name, () => {
  let service: AuthService;
  let configService: ConfigService;
  let jwtService: JwtService;
  let accountRepository: AccountRepository;
  let refreshTokenStore: RefreshTokenStore;
  let ethersFacade: EthersFacade;
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
        AuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn()
          }
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn()
          }
        },
        {
          provide: AccountRepository,
          useValue: {
            setAccountSignedTerms: jest.fn()
          }
        },
        {
          provide: RefreshTokenStore,
          useValue: {
            save: jest.fn(),
            findActive: jest.fn(),
            revoke: jest.fn()
          }
        },
        {
          provide: EthersFacade,
          useValue: {
            getChainId: jest.fn()
          }
        }
      ]
    }).compile();

    service = module.get<AuthService>(AuthService);
    configService = module.get<ConfigService>(ConfigService);
    jwtService = module.get<JwtService>(JwtService);
    accountRepository = module.get<AccountRepository>(AccountRepository);
    refreshTokenStore = module.get<RefreshTokenStore>(RefreshTokenStore);
    ethersFacade = module.get<EthersFacade>(EthersFacade);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe(AuthService.prototype.authenticate.name, () => {
    const accountAddress = '0x1234567890123456789012345678901234567890';
    const ipAddress = '127.0.0.1';
    const dto = {
      message: 'I agree to the terms',
      signedMessage: '0xsignature',
      nonce: 'abc123',
      accountAddress,
      multisig: undefined
    };

    describe('successful authentication', () => {
      beforeEach(() => {
        jest.spyOn(ethersFacade, 'getChainId').mockResolvedValue(1);
        mockVerifyMessage.mockReturnValue(accountAddress);
        jest.spyOn(refreshTokenStore, 'save').mockResolvedValue(undefined);
        jest.spyOn(accountRepository, 'setAccountSignedTerms').mockResolvedValue(undefined);
        jest.spyOn(configService, 'get').mockReturnValue({ secret: 'jwt-secret', ttl: '15m' });
        jest.spyOn(jwtService, 'sign').mockReturnValue('signed.jwt.token');
      });

      it('should return token and refreshToken on valid signature', async () => {
        const result = await service.authenticate(dto, ipAddress);

        expect(result).toEqual({
          token: 'signed.jwt.token',
          refreshToken: expect.any(String)
        });
      });

      it('should save refresh token to store with correct account and IP', async () => {
        await service.authenticate(dto, ipAddress);

        expect(refreshTokenStore.save).toHaveBeenCalledWith(
          expect.objectContaining({
            account: accountAddress.toLowerCase(),
            multisig: undefined,
            createdByIp: '127.0.0.1',
            createdMs: testDate.getTime()
          })
        );
      });

      it('should record signed terms via account repository', async () => {
        await service.authenticate(dto, ipAddress);

        expect(accountRepository.setAccountSignedTerms).toHaveBeenCalledWith({
          wallet: '0x1234567890123456789012345678901234567890',
          message: 'I agree to the terms',
          signedMessage: '0xsignature'
        });
      });

      it('should sign JWT with account and multisig from DTO', async () => {
        await service.authenticate(dto, ipAddress);

        expect(jwtService.sign).toHaveBeenCalledWith(
          { account: accountAddress, multisig: undefined },
          { secret: 'jwt-secret', expiresIn: '15m' }
        );
      });

      it('should include multisig in JWT when provided', async () => {
        const dtoWithMultisig = {
          ...dto,
          multisig: { type: 'gnosis' as const }
        };

        await service.authenticate(dtoWithMultisig as Parameters<typeof service.authenticate>[0], ipAddress);

        expect(jwtService.sign).toHaveBeenCalledWith(
          { account: accountAddress, multisig: { type: 'gnosis' } },
          { secret: 'jwt-secret', expiresIn: '15m' }
        );
      });

      it('should save refresh token with multisig when provided', async () => {
        const dtoWithMultisig = {
          ...dto,
          multisig: { type: 'gnosis' as const }
        };

        await service.authenticate(dtoWithMultisig as Parameters<typeof service.authenticate>[0], ipAddress);

        expect(refreshTokenStore.save).toHaveBeenCalledWith(
          expect.objectContaining({
            multisig: { type: 'gnosis' }
          })
        );
      });

      it('should pass empty multisig object through to JWT and token store', async () => {
        const dtoWithEmptyMultisig = {
          accountAddress: '0xca93f92f8b56cd3b08e4f353a729c905e05626c0',
          message: 'This message proves you own this wallet address : 0xca93f92f8b56cd3b08e4f353a729c905e05626c0',
          nonce: '38450348931695194164611025565166675759305840962024910176868269664497899718501',
          signedMessage:
            '0x9d6da69045e37ab26165ef3cfea634a7b5fd8cca336e2d0db12ade0aafa4959856d877b5b8e879c13cae5ade87264fce6325aaea295dc9d0e1674392970cea9c1b',
          multisig: {}
        };

        mockVerifyMessage.mockReturnValue('0xca93f92f8b56cd3b08e4f353a729c905e05626c0');

        await service.authenticate(dtoWithEmptyMultisig as Parameters<typeof service.authenticate>[0], ipAddress);

        expect(jwtService.sign).toHaveBeenCalledWith(
          { account: '0xca93f92f8b56cd3b08e4f353a729c905e05626c0', multisig: {} },
          { secret: 'jwt-secret', expiresIn: '15m' }
        );
        expect(refreshTokenStore.save).toHaveBeenCalledWith(
          expect.objectContaining({
            account: '0xca93f92f8b56cd3b08e4f353a729c905e05626c0',
            multisig: {}
          })
        );
      });
    });

    describe('invalid signature', () => {
      it('should throw UnprocessableEntityException when signature does not match account', async () => {
        jest.spyOn(ethersFacade, 'getChainId').mockResolvedValue(1);
        mockVerifyMessage.mockReturnValue('0xdifferentaddress000000000000000000000000');

        await expect(service.authenticate(dto, ipAddress)).rejects.toThrow(UnprocessableEntityException);
        expect(refreshTokenStore.save).not.toHaveBeenCalled();
        expect(accountRepository.setAccountSignedTerms).not.toHaveBeenCalled();
      });

      it('should throw UnprocessableEntityException with signed message errors', async () => {
        jest.spyOn(ethersFacade, 'getChainId').mockResolvedValue(1);
        mockVerifyMessage.mockReturnValue('0xdifferentaddress000000000000000000000000');

        await expect(service.authenticate(dto, ipAddress)).rejects.toMatchObject({
          response: { errors: { signedMessage: ['Signature is invalid'] } }
        });
      });

      it('should throw UnprocessableEntityException when verifyMessage throws', async () => {
        jest.spyOn(ethersFacade, 'getChainId').mockResolvedValue(1);
        mockVerifyMessage.mockImplementation(() => {
          throw new Error('invalid signature bytes length');
        });

        await expect(service.authenticate(dto, ipAddress)).rejects.toThrow(UnprocessableEntityException);
      });

      it('should verify signature using chainId from ethersFacade', async () => {
        jest.spyOn(ethersFacade, 'getChainId').mockResolvedValue(5);
        mockVerifyMessage.mockReturnValue(accountAddress);
        jest.spyOn(refreshTokenStore, 'save').mockResolvedValue(undefined);
        jest.spyOn(accountRepository, 'setAccountSignedTerms').mockResolvedValue(undefined);
        jest.spyOn(configService, 'get').mockReturnValue({ secret: 'jwt-secret', ttl: '15m' });
        jest.spyOn(jwtService, 'sign').mockReturnValue('signed.jwt.token');

        await service.authenticate(dto, ipAddress);

        expect(mockVerifyMessage).toHaveBeenCalledWith(
          'I agree to the terms\r\n\r\nChainId : 5\r\nNonce : abc123)',
          '0xsignature'
        );
      });

      it('should perform case-insensitive comparison of recovered and expected address', async () => {
        jest.spyOn(ethersFacade, 'getChainId').mockResolvedValue(1);
        mockVerifyMessage.mockReturnValue(accountAddress.toUpperCase());
        jest.spyOn(refreshTokenStore, 'save').mockResolvedValue(undefined);
        jest.spyOn(accountRepository, 'setAccountSignedTerms').mockResolvedValue(undefined);
        jest.spyOn(configService, 'get').mockReturnValue({ secret: 'jwt-secret', ttl: '15m' });
        jest.spyOn(jwtService, 'sign').mockReturnValue('signed.jwt.token');

        const result = await service.authenticate(dto, ipAddress);

        expect(result.token).toBe('signed.jwt.token');
      });
    });
  });

  describe(AuthService.prototype.refreshToken.name, () => {
    const ipAddress = '10.0.0.1';
    const existingToken = {
      account: '0xabcdef1234567890abcdef1234567890abcdef12',
      multisig: undefined,
      token: 'old-refresh-token',
      createdMs: testDate.getTime(),
      createdByIp: '10.0.0.1'
    };

    describe('successful refresh', () => {
      beforeEach(() => {
        jest.spyOn(refreshTokenStore, 'findActive').mockResolvedValue(existingToken);
        jest.spyOn(refreshTokenStore, 'revoke').mockResolvedValue(undefined);
        jest.spyOn(refreshTokenStore, 'save').mockResolvedValue(undefined);
        jest.spyOn(configService, 'get').mockReturnValue({ secret: 'jwt-secret', ttl: '15m' });
        jest.spyOn(jwtService, 'sign').mockReturnValue('new.jwt.token');
      });

      it('should return new token and refreshToken', async () => {
        const result = await service.refreshToken('old-refresh-token', ipAddress);

        expect(result).toEqual({
          token: 'new.jwt.token',
          refreshToken: expect.any(String)
        });
      });

      it('should revoke the old refresh token', async () => {
        await service.refreshToken('old-refresh-token', ipAddress);

        expect(refreshTokenStore.revoke).toHaveBeenCalledWith('old-refresh-token');
      });

      it('should save a new refresh token with existing account data', async () => {
        await service.refreshToken('old-refresh-token', ipAddress);

        expect(refreshTokenStore.save).toHaveBeenCalledWith(
          expect.objectContaining({
            account: '0xabcdef1234567890abcdef1234567890abcdef12',
            multisig: undefined,
            createdByIp: '10.0.0.1',
            createdMs: testDate.getTime()
          })
        );
      });

      it('should sign JWT with account from existing stored token', async () => {
        await service.refreshToken('old-refresh-token', ipAddress);

        expect(jwtService.sign).toHaveBeenCalledWith(
          { account: '0xabcdef1234567890abcdef1234567890abcdef12', multisig: undefined },
          { secret: 'jwt-secret', expiresIn: '15m' }
        );
      });

      it('should preserve multisig from existing token in new JWT', async () => {
        jest.spyOn(refreshTokenStore, 'findActive').mockResolvedValue({
          ...existingToken,
          multisig: { type: 'gnosis' }
        });

        await service.refreshToken('old-refresh-token', ipAddress);

        expect(jwtService.sign).toHaveBeenCalledWith(
          { account: '0xabcdef1234567890abcdef1234567890abcdef12', multisig: { type: 'gnosis' } },
          { secret: 'jwt-secret', expiresIn: '15m' }
        );
      });

      it('should look up the provided refresh token in store', async () => {
        await service.refreshToken('old-refresh-token', ipAddress);

        expect(refreshTokenStore.findActive).toHaveBeenCalledWith('old-refresh-token');
      });
    });

    describe('invalid or expired token', () => {
      it('should throw UnprocessableEntityException when token is not found', async () => {
        jest.spyOn(refreshTokenStore, 'findActive').mockResolvedValue(null);

        await expect(service.refreshToken('nonexistent-token', ipAddress)).rejects.toThrow(
          UnprocessableEntityException
        );
        expect(refreshTokenStore.revoke).not.toHaveBeenCalled();
        expect(refreshTokenStore.save).not.toHaveBeenCalled();
      });

      it('should throw UnprocessableEntityException with token errors when not found', async () => {
        jest.spyOn(refreshTokenStore, 'findActive').mockResolvedValue(null);

        await expect(service.refreshToken('expired-token', ipAddress)).rejects.toMatchObject({
          response: { errors: { refreshToken: ['Token is invalid or expired'] } }
        });
      });

      it('should throw UnprocessableEntityException when findActive returns undefined', async () => {
        jest.spyOn(refreshTokenStore, 'findActive').mockResolvedValue(undefined);

        await expect(service.refreshToken('undefined-token', ipAddress)).rejects.toThrow(UnprocessableEntityException);
      });
    });
  });
});
