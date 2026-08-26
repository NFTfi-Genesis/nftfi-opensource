import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthModuleConfigToken, AuthService } from '@nftfi.api/modules/auth-guard';
import { OfferRepository } from '@nftfi.api/repositories/postgres/offer';
import { OfferV01Controller, OfferV01Service } from '../src/offer-legacy';

describe(OfferV01Controller.name, () => {
  let app: INestApplication;
  let offerRepository: { findById: jest.Mock; softDelete: jest.Mock };
  let jwtService: { verifyAsync: jest.Mock };

  beforeEach(async () => {
    jest.resetAllMocks();
    offerRepository = { findById: jest.fn(), softDelete: jest.fn() };
    jwtService = { verifyAsync: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [(): object => ({})]
        })
      ],
      controllers: [OfferV01Controller],
      providers: [
        OfferV01Service,
        AuthService,
        { provide: OfferRepository, useValue: offerRepository },
        { provide: JwtService, useValue: jwtService },
        { provide: AuthModuleConfigToken, useValue: { secret: 'test-secret' } }
      ]
    }).compile();

    app = moduleRef.createNestApplication();

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe(OfferV01Controller.prototype.handleGet.name, () => {
    it('get endpoint is deprecated', async () => {
      const response = await request(app.getHttpServer()).get('/v0.1/offers?lenderAddress=0x111');
      expect(response.status).toBe(410);
      expect(response.body).toEqual({ message: 'This endpoint is deprecated' });
    });
  });

  describe(OfferV01Controller.prototype.handlePost.name, () => {
    it('post endpoint is deprecated', async () => {
      const response = await request(app.getHttpServer()).post('/v0.1/offers');

      expect(response.status).toBe(410);
      expect(response.body).toEqual({ message: 'This endpoint is deprecated' });
    });
  });

  describe(OfferV01Controller.prototype.handleDelete.name, () => {
    const buildJwtToken = (payload: object): string =>
      `test.${Buffer.from(JSON.stringify(payload)).toString('base64')}.test`;

    it('soft-deletes an offer owned by the authenticated lender', async () => {
      const payload = { account: '0xabc' };
      jwtService.verifyAsync.mockResolvedValue(payload);
      offerRepository.findById.mockResolvedValue({ id: 42, lender: '0xabc' });
      offerRepository.softDelete.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .delete('/v0.1/offers/42')
        .set('Authorization', `Bearer ${buildJwtToken(payload)}`);

      expect(response.status).toBe(200);
      expect(response.text).toBe('OK');
      expect(offerRepository.softDelete).toHaveBeenCalledWith(42);
    });

    it('returns 404 when the offer does not exist', async () => {
      const payload = { account: '0xabc' };
      jwtService.verifyAsync.mockResolvedValue(payload);
      offerRepository.findById.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .delete('/v0.1/offers/42')
        .set('Authorization', `Bearer ${buildJwtToken(payload)}`);

      expect(response.status).toBe(404);
      expect(offerRepository.softDelete).not.toHaveBeenCalled();
    });

    it('returns 401 when authenticated account does not match offer lender', async () => {
      const payload = { account: '0xother' };
      jwtService.verifyAsync.mockResolvedValue(payload);
      offerRepository.findById.mockResolvedValue({ id: 42, lender: '0xabc' });

      const response = await request(app.getHttpServer())
        .delete('/v0.1/offers/42')
        .set('Authorization', `Bearer ${buildJwtToken(payload)}`);

      expect(response.status).toBe(401);
      expect(offerRepository.softDelete).not.toHaveBeenCalled();
    });
  });
});
