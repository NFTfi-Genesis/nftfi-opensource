import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import axios, { AxiosInstance } from 'axios';
import request from 'supertest';

import { SupportedCurrencies } from '@nftfi.api/core';

import { LoanController } from '../src/loan-legacy';

describe(LoanController.name, () => {
  let app: INestApplication;
  let httpClient: AxiosInstance;

  beforeEach(async () => {
    jest.resetAllMocks();

    httpClient = { get: jest.fn() } as unknown as AxiosInstance;
    jest.spyOn(axios, 'create').mockReturnValue(httpClient);

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            (): object => ({
              dapp: {
                api: {
                  uri: 'http://nftfi-api:3600'
                }
              },
              supportedCurrencies: new SupportedCurrencies({
                DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                WETH: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
              })
            })
          ]
        })
      ],
      controllers: [LoanController],
      providers: []
    }).compile();

    app = moduleRef.createNestApplication();

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe(LoanController.prototype.handleGet.name, () => {
    it('get endpoint is deprecated', async () => {
      const response = await request(app.getHttpServer()).get(
        '/loans?counterparty=lender&accountAddress=0x40B59781Fc653ce093CC74c206Bc3Fcb09252e3E'
      );
      expect(response.status).toBe(410);
      expect(response.body).toEqual({
        message: 'This endpoint is deprecated'
      });
    });
  });
});
