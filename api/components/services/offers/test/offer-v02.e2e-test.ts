import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { OfferV02Controller } from '../src/offer-legacy';

describe(OfferV02Controller.name, () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [OfferV02Controller]
    }).compile();

    app = moduleRef.createNestApplication();

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe(OfferV02Controller.prototype.handleGet.name, () => {
    it('get endpoint is deprecated', async () => {
      const response = await request(app.getHttpServer()).get('/v0.2/offers?lenderAddress=0x111');
      expect(response.status).toBe(410);
      expect(response.body).toEqual({ message: 'This endpoint is deprecated' });
    });
  });

  describe(OfferV02Controller.prototype.handlePost.name, () => {
    it('post endpoint is deprecated', async () => {
      const response = await request(app.getHttpServer()).post('/v0.2/offers');

      expect(response.status).toBe(410);
      expect(response.body).toEqual({ message: 'This endpoint is deprecated' });
    });
  });
});
