import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { LoanContract, SupportedCurrencies } from '@nftfi.api/core';
import { OfferRepository, OfferType } from '@nftfi.api/repositories/postgres/offer';
import { httpValidationPipe } from '@nftfi.api/validation/api-validation.pipe';
import { OfferCountV01Controller, OfferCountV01Service } from '../src/offer-legacy';

describe(OfferCountV01Controller.name, () => {
  let app: INestApplication;
  let offerRepository: { countBy: jest.Mock };

  beforeEach(async () => {
    jest.resetAllMocks();
    offerRepository = { countBy: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            (): object => ({
              legacy: {
                v03: {
                  contractNameByType: {
                    [OfferType.Asset]: LoanContract.V23Fixed,
                    [OfferType.Collection]: LoanContract.V23FixedCollection,
                    [OfferType.Contract]: LoanContract.V23FixedCollection
                  },
                  adminFeeBps: 200
                }
              }
            })
          ]
        })
      ],
      controllers: [OfferCountV01Controller],
      providers: [
        OfferCountV01Service,
        { provide: OfferRepository, useValue: offerRepository },
        {
          provide: SupportedCurrencies,
          useValue: new SupportedCurrencies({
            WETH: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
            DAI: '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844',
            USDC: '0x07865c6e87b9f70255377e024ace6630c1eaa37f'
          })
        }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(httpValidationPipe);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe(OfferCountV01Controller.prototype.handlerGet.name, () => {
    it('returns a validation error when required query parameters are missing', async () => {
      const response = await request(app.getHttpServer()).get(
        '/v0.1/offers-count?nftAddress=0x111&group=termsCurrencyAddress'
      );

      expect(response.status).toBe(422);
      expect(response.body).toEqual({
        errors: {
          lenderAddress: ['lenderAddress should not be empty', 'lenderAddress must be a string']
        }
      });
    });

    it('returns asset offer counts per currency split by prorated flag', async () => {
      offerRepository.countBy.mockResolvedValue(1);

      const response = await request(app.getHttpServer()).get(
        '/v0.1/offers-count?lenderAddress=0x184ba627DB853244c9f17f3Cb4378cB8B39bf147&nftAddress=0x17Fe01c95dDC892DFd80e854CE470A621E17e5aA&nftId=1&group=termsCurrencyAddress'
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        result: {
          filters: {
            nft: { address: '0x17fe01c95ddc892dfd80e854ce470a621e17e5aa', id: '1' },
            lender: { address: '0x184ba627db853244c9f17f3cb4378cb8b39bf147' },
            nftfi: { contract: { name: 'v2-3.loan.fixed' } },
            type: 'asset'
          },
          counts: [
            {
              group: { key: 'termsCurrencyAddress', value: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6' },
              count: 2,
              interestProrated: { nonProrated: { count: 1 }, prorated: { count: 1 } }
            },
            {
              group: { key: 'termsCurrencyAddress', value: '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844' },
              count: 2,
              interestProrated: { nonProrated: { count: 1 }, prorated: { count: 1 } }
            },
            {
              group: { key: 'termsCurrencyAddress', value: '0x07865c6e87b9f70255377e024ace6630c1eaa37f' },
              count: 2,
              interestProrated: { nonProrated: { count: 1 }, prorated: { count: 1 } }
            }
          ]
        }
      });
      expect(offerRepository.countBy.mock.calls.map(([arg]) => arg)).toEqual([
        {
          lender: '0x184ba627db853244c9f17f3cb4378cb8b39bf147',
          nftContract: '0x17fe01c95ddc892dfd80e854ce470a621e17e5aa',
          nftTokenId: '1',
          currency: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
          type: 'asset',
          prorated: false
        },
        {
          lender: '0x184ba627db853244c9f17f3cb4378cb8b39bf147',
          nftContract: '0x17fe01c95ddc892dfd80e854ce470a621e17e5aa',
          nftTokenId: '1',
          currency: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
          type: 'asset',
          prorated: true
        },
        {
          lender: '0x184ba627db853244c9f17f3cb4378cb8b39bf147',
          nftContract: '0x17fe01c95ddc892dfd80e854ce470a621e17e5aa',
          nftTokenId: '1',
          currency: '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844',
          type: 'asset',
          prorated: false
        },
        {
          lender: '0x184ba627db853244c9f17f3cb4378cb8b39bf147',
          nftContract: '0x17fe01c95ddc892dfd80e854ce470a621e17e5aa',
          nftTokenId: '1',
          currency: '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844',
          type: 'asset',
          prorated: true
        },
        {
          lender: '0x184ba627db853244c9f17f3cb4378cb8b39bf147',
          nftContract: '0x17fe01c95ddc892dfd80e854ce470a621e17e5aa',
          nftTokenId: '1',
          currency: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
          type: 'asset',
          prorated: false
        },
        {
          lender: '0x184ba627db853244c9f17f3cb4378cb8b39bf147',
          nftContract: '0x17fe01c95ddc892dfd80e854ce470a621e17e5aa',
          nftTokenId: '1',
          currency: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
          type: 'asset',
          prorated: true
        }
      ]);
    });

    it('returns collection offer counts when no nftId is provided', async () => {
      offerRepository.countBy.mockResolvedValue(1);

      const response = await request(app.getHttpServer()).get(
        '/v0.1/offers-count?lenderAddress=0x123&nftAddress=0x111&group=termsCurrencyAddress'
      );

      expect(response.status).toBe(200);
      expect(response.body.result.filters).toEqual({
        nft: { address: '0x111', id: '0' },
        lender: { address: '0x123' },
        nftfi: { contract: { name: 'v2-3.loan.fixed.collection' } },
        type: 'collection'
      });
      expect(offerRepository.countBy.mock.calls[0][0]).toEqual({
        lender: '0x123',
        nftContract: '0x111',
        nftTokenId: '0',
        currency: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
        type: 'collection',
        prorated: false
      });
    });
  });
});
