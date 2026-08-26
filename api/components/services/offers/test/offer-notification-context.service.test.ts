import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { SupportedCurrencies } from '@nftfi.api/core';
import { AssetsFacade } from '@nftfi.api/facades/assets';
import { buildAssetDto } from '@nftfi.api/services/assets/factories';
import { buildPostgresOffer } from '@nftfi.api/repositories/postgres/factories/offer';
import { buildPostgresMarketLoan } from '@nftfi.api/repositories/postgres/factories/market-loan';
import { OfferNotificationContextService, OfferNotificationService } from '../src/offer-notification';

describe(OfferNotificationService.name, () => {
  let app: INestApplication;
  let service: OfferNotificationContextService;
  let assetQueueFacade: AssetsFacade;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            (): object => ({
              dapp: {
                url: 'http://nftfi.dapp',
                api: {
                  uri: 'http://nftfi-api:3600'
                }
              }
            })
          ]
        })
      ],
      providers: [
        OfferNotificationContextService,
        {
          provide: AssetsFacade,
          useValue: {
            getAssetByKey: jest.fn()
          }
        },
        {
          provide: SupportedCurrencies,
          useValue: new SupportedCurrencies({
            WETH: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
            DAI: '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844',
            USDC: '0x07865c6e87b9f70255377e024ace6630c1eaa37f'
          })
        }
      ]
    }).compile();

    app = moduleRef.createNestApplication();

    service = moduleRef.get(OfferNotificationContextService);
    assetQueueFacade = moduleRef.get(AssetsFacade);

    await app.init();
  });

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01'));
  });

  afterAll(async () => {
    await app.close();
  });

  describe(OfferNotificationContextService.prototype.getBorrowerLiquidutySummary.name, () => {
    it('groups offers by NFT key, picks top 3 by APR, and builds a summary', async () => {
      const offers = [
        buildPostgresOffer({
          id: 1,
          nftContract: '0xnft1',
          nftTokenIdFrom: '1',
          currency: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
          lender: '0x1111111111111111111111111111111111111111',
          principal: '1000000000000000',
          repaymentMax: '1001000000000000',
          apr: 37,
          duration: 86400,
          createdAt: new Date('2024-04-10T21:29:34.000Z')
        }),
        buildPostgresOffer({
          id: 2,
          nftContract: '0xnft1',
          nftTokenIdFrom: '1',
          currency: '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844',
          lender: '0x1111111111111111111111111111111111111111',
          principal: '1000000000000000',
          repaymentMax: '1001000000000000',
          apr: 30,
          duration: 86400,
          createdAt: new Date('2024-04-10T21:29:34.000Z')
        }),
        buildPostgresOffer({
          id: 3,
          nftContract: '0xnft2',
          nftTokenIdFrom: '5',
          currency: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
          lender: '0x1111111111111111111111111111111111111111',
          principal: '1000',
          repaymentMax: '1001',
          apr: 37,
          duration: 86400,
          createdAt: new Date('2024-04-10T21:29:34.000Z')
        })
      ];
      jest.spyOn(assetQueueFacade, 'getAssetByKey').mockResolvedValue(buildAssetDto());

      const result = await service.getBorrowerLiquidutySummary('0x123', offers);

      expect(result).toEqual({
        borrower: '0x123',
        assetOfferGroups: [
          {
            assetCategory: 'Test Collection',
            assetName: 'Test Collection',
            assetUrl: 'http://nftfi.dapp/assets/0xnft1/1',
            imagePreviewUrl: 'https://example.com/medium.png',
            offers: [
              {
                apr: 37,
                currency: { ticker: 'wETH' },
                dueDate: '21:29 Thursday 11th Apr (GMT+0)',
                durationDays: 1,
                lender: '0x11111',
                nftCollateralContract: '0xnft1',
                nftCollateralId: '1',
                nftKey: '0xnft1-1',
                offerId: '1',
                principal: 0.001,
                repayment: 0.001001
              },
              {
                apr: 30,
                currency: { ticker: 'DAI' },
                dueDate: '21:29 Thursday 11th Apr (GMT+0)',
                durationDays: 1,
                lender: '0x11111',
                nftCollateralContract: '0xnft1',
                nftCollateralId: '1',
                nftKey: '0xnft1-1',
                offerId: '2',
                principal: 0.001,
                repayment: 0.001001
              }
            ],
            totalOffers: 2
          },
          {
            assetCategory: 'Test Collection',
            assetName: 'Test Collection',
            assetUrl: 'http://nftfi.dapp/assets/0xnft2/5',
            imagePreviewUrl: 'https://example.com/medium.png',
            offers: [
              {
                apr: 37,
                currency: { ticker: 'USDC' },
                dueDate: '21:29 Thursday 11th Apr (GMT+0)',
                durationDays: 1,
                lender: '0x11111',
                nftCollateralContract: '0xnft2',
                nftCollateralId: '5',
                nftKey: '0xnft2-5',
                offerId: '3',
                principal: 0.001,
                repayment: 0.001001
              }
            ],
            totalOffers: 1
          }
        ],
        assetUrl: 'http://nftfi.dapp/borrow/offers'
      });
    });
  });

  describe(OfferNotificationContextService.prototype.getOffer.name, () => {
    it('returns the context with the offer received', async () => {
      jest.spyOn(assetQueueFacade, 'getAssetByKey').mockResolvedValue(buildAssetDto());

      const offer = buildPostgresOffer({
        id: 1,
        nftContract: '0xnft',
        nftTokenIdFrom: '1',
        currency: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
        borrower: '0x555',
        lender: '0x111',
        principal: '1000000000000000',
        repaymentMax: '1001000000000000',
        apr: 37,
        expiresAt: new Date('2023-01-01T00:00:00.000Z')
      });

      const result = await service.getOffer(offer);

      expect(result).toEqual({
        assetCategory: 'Test Collection',
        assetName: 'Test Collection',
        assetUrl: 'http://nftfi.dapp/assets/0xnft/1',
        apr: 37,
        borrower: '0x555',
        lender: '0x111',
        currency: { ticker: 'wETH' },
        dueTime: '00:00 01 Jan 2023 GMT+00:00',
        durationDays: 1,
        imagePreviewUrl: 'https://example.com/medium.png',
        principal: 0.001,
        repayment: 0.001001
      });
    });

    it('returns empty asset context when the asset is not found', async () => {
      jest.spyOn(assetQueueFacade, 'getAssetByKey').mockResolvedValue(null);

      const offer = buildPostgresOffer({
        id: 1,
        nftContract: '0xnft',
        nftTokenIdFrom: '1',
        currency: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
        borrower: '0x555',
        lender: '0x111',
        principal: '1000000000000000',
        repaymentMax: '1001000000000000',
        apr: 37,
        expiresAt: new Date('2023-01-01T00:00:00.000Z')
      });

      const result = await service.getOffer(offer);

      expect(result).toEqual({
        assetCategory: '',
        assetName: '',
        assetUrl: 'http://nftfi.dapp/assets/0xnft/1',
        apr: 37,
        borrower: '0x555',
        lender: '0x111',
        currency: { ticker: 'wETH' },
        dueTime: '00:00 01 Jan 2023 GMT+00:00',
        durationDays: 1,
        imagePreviewUrl: '',
        principal: 0.001,
        repayment: 0.001001
      });
    });
  });

  describe(OfferNotificationContextService.prototype.getRefiOffer.name, () => {
    it('returns the context for a refinancing offer', async () => {
      jest.spyOn(assetQueueFacade, 'getAssetByKey').mockResolvedValue(buildAssetDto());

      const offer = buildPostgresOffer({
        id: 1,
        nftContract: '0xnft',
        nftTokenIdFrom: '1',
        currency: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
        borrower: '0x555',
        lender: '0x111',
        originationFee: '1000000',
        principal: '1000000000000000',
        repaymentMax: '1001000000000000',
        apr: 37,
        duration: 86400
      });
      const loan = buildPostgresMarketLoan({
        loanId: '67',
        borrower: '0x8a32121d737ce9c7b7b6e17cc7f10d7c2d5f8adc',
        lender: '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d',
        repaymentMax: '1001000000000000',
        apr: 12,
        duration: 86400 * 90,
        startedAt: new Date('2022-07-20T00:00:00.000Z')
      });

      const result = await service.getRefiOffer(offer, loan);

      expect(result).toEqual({
        assetCategory: 'Test Collection',
        assetName: 'Test Collection',
        assetUrl: 'http://nftfi.dapp/assets/0xnft/1',
        borrower: '0x8a32121d737ce9c7b7b6e17cc7f10d7c2d5f8adc',
        currency: {
          contractAddress: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
          denomination: 'ether',
          denominationDecimals: 18,
          ticker: 'wETH'
        },
        diffApr: 25,
        diffRepayment: 0,
        dueTime: '21 Jul 2022',
        fee: 1e-12,
        imagePreviewUrl: 'https://example.com/medium.png',
        lender: '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d',
        loanId: 67,
        newApr: 37,
        newDurationDays: 1,
        newRepayment: 0.001001,
        oldApr: 12,
        oldDurationDays: 90,
        oldRepayment: 0.001001
      });
    });
  });
});
