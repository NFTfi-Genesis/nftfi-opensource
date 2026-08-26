import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthModuleConfigToken, AuthService } from '@nftfi.api/modules/auth-guard';
import { OfferRepository } from '@nftfi.api/repositories/postgres/offer';
import { OfferController, OfferV01Service } from '../src/offer-legacy';

describe(OfferController.name, () => {
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
      controllers: [OfferController],
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

  describe(OfferController.prototype.handleGet.name, () => {
    it('get endpoint is deprecated', async () => {
      const response = await request(app.getHttpServer()).get('/offers?lenderAddress=0x111');
      expect(response.status).toBe(410);
      expect(response.body).toEqual({ message: 'This endpoint is deprecated' });
    });
  });

  describe(OfferController.prototype.handlePost.name, () => {
    it('post endpoint is deprecated', async () => {
      const response = await request(app.getHttpServer()).post('/offers');

      expect(response.status).toBe(410);
      expect(response.body).toEqual({ message: 'This endpoint is deprecated' });
    });
  });

  describe(OfferController.prototype.handleDelete.name, () => {
    it('soft-deletes an offer owned by the authenticated lender', async () => {
      const payload = { account: '0xabc' };
      const jwtToken = `test.${Buffer.from(JSON.stringify(payload)).toString('base64')}.test`;
      jwtService.verifyAsync.mockResolvedValue(payload);
      offerRepository.findById.mockResolvedValue({ id: 7, lender: '0xabc' });
      offerRepository.softDelete.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .delete('/offers/7')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(response.status).toBe(200);
      expect(response.text).toBe('OK');
      expect(offerRepository.softDelete).toHaveBeenCalledWith(7);
    });
  });
});
