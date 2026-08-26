import { NestApplication } from '@nestjs/core';
import { Controller, Get } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import Supertest from 'supertest';
import { AuthToken, DecodedAuthToken, type AuthTokenPayload } from '@nftfi.api/modules/auth-guard';

describe('auth-token', () => {
  describe(AuthToken.name, () => {
    let app: NestApplication;

    @Controller()
    class TestController {
      @Get('/')
      handleGet(@AuthToken() token: string): { result: string } {
        return { result: token };
      }
    }

    beforeEach(async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [TestController]
      }).compile();

      app = moduleRef.createNestApplication();

      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('returns token if authorization header was found', async () => {
      const response = await Supertest(app.getHttpServer()).get('/').set('Authorization', 'Bearer test-token');
      expect(response.body).toEqual({ result: 'test-token' });
    });

    it('returns token if x-forwarded-authorization header was found', async () => {
      const response = await Supertest(app.getHttpServer())
        .get('/')
        .set('X-Forwarded-Authorization', 'Bearer test-token');
      expect(response.body).toEqual({ result: 'test-token' });
    });

    it('returns empty string if specific header does not exist', async () => {
      const response = await Supertest(app.getHttpServer()).get('/');
      expect(response.body).toEqual({ result: '' });
    });
  });

  describe(DecodedAuthToken.name, () => {
    let app: NestApplication;

    const tokenBufferPayload = Buffer.from(
      JSON.stringify({
        account: 'foobar',
        multisig: { type: 'gnosis' },
        iat: 123,
        exp: 456
      })
    );

    const tokenEncodedPayload = `Bearer test.${tokenBufferPayload.toString('base64')}`;

    @Controller()
    class TestController {
      @Get('/')
      handleGet(@DecodedAuthToken() tokenPayload: AuthTokenPayload): { result: AuthTokenPayload } {
        return { result: tokenPayload };
      }
    }

    beforeEach(async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [TestController]
      }).compile();

      app = moduleRef.createNestApplication();

      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('returns decoded token if authorization header was found', async () => {
      const response = await Supertest(app.getHttpServer()).get('/').set('Authorization', tokenEncodedPayload);
      expect(response.body).toEqual({
        result: {
          account: 'foobar',
          multisig: { type: 'gnosis' },
          iat: 123,
          exp: 456
        }
      });
    });

    it('returns token if x-forwarded-authorization header was found', async () => {
      const response = await Supertest(app.getHttpServer())
        .get('/')
        .set('X-Forwarded-Authorization', tokenEncodedPayload);
      expect(response.body).toEqual({
        result: {
          account: 'foobar',
          multisig: { type: 'gnosis' },
          iat: 123,
          exp: 456
        }
      });
    });

    it('returns empty object if specific header does not exist', async () => {
      const response = await Supertest(app.getHttpServer()).get('/');
      expect(response.body).toEqual({ result: {} });
    });
  });
});
