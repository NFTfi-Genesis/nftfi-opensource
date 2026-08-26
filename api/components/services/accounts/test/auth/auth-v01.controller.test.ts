import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UnprocessableEntityException } from '@nestjs/common';
import request from 'supertest';
import { httpValidationPipe } from '@nftfi.api/validation';
import { AuthV01Controller } from '../../src/auth/auth-v01.controller';
import { AuthService } from '../../src/auth/auth.service';

describe(AuthV01Controller.name, () => {
  let app: INestApplication;
  let authService: AuthService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthV01Controller],
      providers: [
        {
          provide: AuthService,
          useValue: {
            authenticate: jest.fn(),
            refreshToken: jest.fn()
          }
        }
      ]
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(httpValidationPipe);

    authService = moduleFixture.get<AuthService>(AuthService);
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  describe('POST /v0.1/authorization/token', () => {
    describe('successful authentication', () => {
      it('should return 200 on valid authenticate request', async () => {
        jest.spyOn(authService, 'authenticate').mockResolvedValue({
          token: 'jwt.access.token',
          refreshToken: 'refresh-token-value'
        });

        await request(app.getHttpServer())
          .post('/v0.1/authorization/token')
          .send({
            message: 'I agree to the terms',
            signedMessage: '0xsignature',
            nonce: 'nonce123',
            accountAddress: '0x1234567890123456789012345678901234567890'
          })
          .expect(200);
      });

      it('should return token wrapped in result object', async () => {
        jest.spyOn(authService, 'authenticate').mockResolvedValue({
          token: 'jwt.access.token',
          refreshToken: 'refresh-token-value'
        });

        const response = await request(app.getHttpServer())
          .post('/v0.1/authorization/token')
          .send({
            message: 'I agree to the terms',
            signedMessage: '0xsignature',
            nonce: 'nonce123',
            accountAddress: '0x1234567890123456789012345678901234567890'
          })
          .expect(200);

        expect(response.body).toEqual({
          result: { token: 'jwt.access.token', refreshToken: 'refresh-token-value' }
        });
      });

      it('should call authService.authenticate with request body and client IP', async () => {
        jest.spyOn(authService, 'authenticate').mockResolvedValue({
          token: 'jwt.access.token',
          refreshToken: 'refresh-token-value'
        });

        await request(app.getHttpServer())
          .post('/v0.1/authorization/token')
          .send({
            message: 'I agree to the terms',
            signedMessage: '0xsignature',
            nonce: 'nonce123',
            accountAddress: '0x1234567890123456789012345678901234567890'
          })
          .expect(200);

        expect(authService.authenticate).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'I agree to the terms',
            signedMessage: '0xsignature',
            nonce: 'nonce123',
            accountAddress: '0x1234567890123456789012345678901234567890'
          }),
          expect.any(String)
        );
      });

      it('should accept request with optional multisig field', async () => {
        jest.spyOn(authService, 'authenticate').mockResolvedValue({
          token: 'jwt.access.token',
          refreshToken: 'refresh-token-value'
        });

        await request(app.getHttpServer())
          .post('/v0.1/authorization/token')
          .send({
            message: 'I agree to the terms',
            signedMessage: '0xsignature',
            nonce: 'nonce123',
            accountAddress: '0x1234567890123456789012345678901234567890',
            multisig: { type: 'gnosis' }
          })
          .expect(200);

        expect(authService.authenticate).toHaveBeenCalledWith(
          expect.objectContaining({ multisig: { type: 'gnosis' } }),
          expect.any(String)
        );
      });
    });

    describe('invalid request body', () => {
      it('should return 422 when message is missing', async () => {
        await request(app.getHttpServer())
          .post('/v0.1/authorization/token')
          .send({
            signedMessage: '0xsignature',
            nonce: 'nonce123',
            accountAddress: '0x1234567890123456789012345678901234567890'
          })
          .expect(422);

        expect(authService.authenticate).not.toHaveBeenCalled();
      });

      it('should return 422 when signedMessage is missing', async () => {
        await request(app.getHttpServer())
          .post('/v0.1/authorization/token')
          .send({
            message: 'I agree to the terms',
            nonce: 'nonce123',
            accountAddress: '0x1234567890123456789012345678901234567890'
          })
          .expect(422);

        expect(authService.authenticate).not.toHaveBeenCalled();
      });

      it('should return 422 when nonce is missing', async () => {
        await request(app.getHttpServer())
          .post('/v0.1/authorization/token')
          .send({
            message: 'I agree to the terms',
            signedMessage: '0xsignature',
            accountAddress: '0x1234567890123456789012345678901234567890'
          })
          .expect(422);

        expect(authService.authenticate).not.toHaveBeenCalled();
      });

      it('should return 422 when accountAddress is missing', async () => {
        await request(app.getHttpServer())
          .post('/v0.1/authorization/token')
          .send({ message: 'I agree to the terms', signedMessage: '0xsignature', nonce: 'nonce123' })
          .expect(422);

        expect(authService.authenticate).not.toHaveBeenCalled();
      });

      it('should return 422 when accountAddress is not a valid Ethereum address', async () => {
        await request(app.getHttpServer())
          .post('/v0.1/authorization/token')
          .send({
            message: 'I agree to the terms',
            signedMessage: '0xsignature',
            nonce: 'nonce123',
            accountAddress: 'not-an-address'
          })
          .expect(422);

        expect(authService.authenticate).not.toHaveBeenCalled();
      });

      it('should return 422 when body is empty', async () => {
        await request(app.getHttpServer()).post('/v0.1/authorization/token').send({}).expect(422);

        expect(authService.authenticate).not.toHaveBeenCalled();
      });
    });

    describe('service errors', () => {
      it('should return 422 when signature is invalid', async () => {
        jest
          .spyOn(authService, 'authenticate')
          .mockRejectedValue(new UnprocessableEntityException({ errors: { signedMessage: ['Signature is invalid'] } }));

        const response = await request(app.getHttpServer())
          .post('/v0.1/authorization/token')
          .send({
            message: 'I agree to the terms',
            signedMessage: '0xsignature',
            nonce: 'nonce123',
            accountAddress: '0x1234567890123456789012345678901234567890'
          })
          .expect(422);

        expect(response.body.errors.signedMessage).toEqual(['Signature is invalid']);
      });
    });
  });

  describe('POST /v0.1/authorization/refresh-token', () => {
    describe('successful refresh', () => {
      it('should return 200 on valid refresh token request', async () => {
        jest.spyOn(authService, 'refreshToken').mockResolvedValue({
          token: 'new.jwt.token',
          refreshToken: 'new-refresh-token-value'
        });

        await request(app.getHttpServer())
          .post('/v0.1/authorization/refresh-token')
          .send({ refreshToken: 'existing-refresh-token-value' })
          .expect(200);
      });

      it('should return token wrapped in result object', async () => {
        jest.spyOn(authService, 'refreshToken').mockResolvedValue({
          token: 'new.jwt.token',
          refreshToken: 'new-refresh-token-value'
        });

        const response = await request(app.getHttpServer())
          .post('/v0.1/authorization/refresh-token')
          .send({ refreshToken: 'existing-refresh-token-value' })
          .expect(200);

        expect(response.body).toEqual({
          result: { token: 'new.jwt.token', refreshToken: 'new-refresh-token-value' }
        });
      });

      it('should call authService.refreshToken with token value and client IP', async () => {
        jest.spyOn(authService, 'refreshToken').mockResolvedValue({
          token: 'new.jwt.token',
          refreshToken: 'new-refresh-token-value'
        });

        await request(app.getHttpServer())
          .post('/v0.1/authorization/refresh-token')
          .send({ refreshToken: 'existing-refresh-token-value' })
          .expect(200);

        expect(authService.refreshToken).toHaveBeenCalledWith('existing-refresh-token-value', expect.any(String));
      });
    });

    describe('invalid request body', () => {
      it('should return 422 when refreshToken is missing', async () => {
        await request(app.getHttpServer()).post('/v0.1/authorization/refresh-token').send({}).expect(422);

        expect(authService.refreshToken).not.toHaveBeenCalled();
      });

      it('should return 422 when refreshToken is empty string', async () => {
        await request(app.getHttpServer())
          .post('/v0.1/authorization/refresh-token')
          .send({ refreshToken: '' })
          .expect(422);

        expect(authService.refreshToken).not.toHaveBeenCalled();
      });
    });

    describe('service errors', () => {
      it('should return 422 when refresh token is invalid or expired', async () => {
        jest
          .spyOn(authService, 'refreshToken')
          .mockRejectedValue(
            new UnprocessableEntityException({ errors: { refreshToken: ['Token is invalid or expired'] } })
          );

        const response = await request(app.getHttpServer())
          .post('/v0.1/authorization/refresh-token')
          .send({ refreshToken: 'existing-refresh-token-value' })
          .expect(422);

        expect(response.body.errors.refreshToken).toEqual(['Token is invalid or expired']);
      });
    });
  });
});
