import { INestApplication, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { LoanContract, SupportedCurrencies } from '@nftfi.api/core';
import { Offer, OfferRepository, OfferType } from '@nftfi.api/repositories/postgres/offer';
import { MarketLoanRepository } from '@nftfi.api/repositories/postgres/market-loan';
import { AssetsFacade } from '@nftfi.api/facades/assets';
import { GnosisFacade } from '@nftfi.api/facades/gnosis';
import { AssetContract } from '@nftfi.api/services/assets';
import { buildAssetDto, buildCollectionDto } from '@nftfi.api/services/assets/factories';
import { httpValidationPipe } from '@nftfi.api/validation';
import { AuthModuleConfigToken, AuthService } from '@nftfi.api/modules/auth-guard';
import { OfferV03Controller, OfferV03Service } from '../src/offer-legacy';
import { OfferNotificationService } from '../src/offer-notification';

const buildPgOffer = (overrides: Partial<Offer> = {}): Offer =>
  ({
    id: 1,
    type: OfferType.Asset,
    borrower: '0x0000000000000000000000000000000000000000',
    lender: '0xa83114a443da1cecefc50368531cace9f37fcccb',
    lenderNonce: '1',
    nftContract: '0xaaa',
    nftTokenIdFrom: '1',
    nftTokenIdTo: '1',
    currency: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
    principal: '1000',
    repaymentMax: '1001',
    originationFee: '0',
    apr: 37,
    eapr: 37,
    duration: 86400,
    expiresAt: new Date('2026-04-10T21:29:34.000Z'),
    prorated: false,
    signature: '0xsig',
    createdAt: new Date('2024-04-10T21:29:34.000Z'),
    updatedAt: new Date('2024-04-10T21:29:34.000Z'),
    ...overrides
  } as Offer);

describe(OfferV03Controller.name, () => {
  let app: INestApplication;
  let offerRepository: { countBy: jest.Mock; findSortPaginateBy: jest.Mock; create: jest.Mock };
  let marketLoanRepository: { find: jest.Mock };
  let assetsFacade: { getAssets: jest.Mock; getCollectionsByContract: jest.Mock };
  let assetContract: { isOwnerOf: jest.Mock };
  let jwtService: { verifyAsync: jest.Mock };
  let notificationService: { notifyBorrowerReceivedOffer: jest.Mock };

  beforeEach(async () => {
    jest.resetAllMocks();
    offerRepository = { countBy: jest.fn(), findSortPaginateBy: jest.fn(), create: jest.fn() };
    marketLoanRepository = { find: jest.fn().mockResolvedValue([]) };
    assetsFacade = { getAssets: jest.fn(), getCollectionsByContract: jest.fn() };
    assetContract = { isOwnerOf: jest.fn().mockResolvedValue(false) };
    jwtService = { verifyAsync: jest.fn() };
    notificationService = { notifyBorrowerReceivedOffer: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            (): object => ({
              pagination: { limit: 20, page: 1 },
              validation: { minimumLoanDurationSeconds: 86400, createLimit: { asset: 5, collection: 5, contract: 5 } },
              integrators: JSON.stringify([
                {
                  integrator: '0x5f79Bd35435A7B98493543DB0fec7F55292E9e77',
                  apiKeys: ['test-api-key'],
                  nftAddresses: ['0xB8cAa4D1284E92C6b46b4113BE20b2CACE1F634B']
                }
              ]),
              contracts: { nftfi: { escrowV3: '0x2ae3e46290ade43593eabd15642ebd67157f5351' } },
              gnosis: { urlTransaction: 'https://safe.example' },
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
      controllers: [OfferV03Controller],
      providers: [
        OfferV03Service,
        AuthService,
        { provide: OfferRepository, useValue: offerRepository },
        { provide: MarketLoanRepository, useValue: marketLoanRepository },
        { provide: AssetsFacade, useValue: assetsFacade },
        { provide: GnosisFacade, useValue: { getSafes: jest.fn().mockResolvedValue([]) } },
        { provide: AssetContract, useValue: assetContract },
        { provide: OfferNotificationService, useValue: notificationService },
        { provide: JwtService, useValue: jwtService },
        { provide: AuthModuleConfigToken, useValue: { secret: 'test-secret' } },
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
    app.useGlobalPipes(httpValidationPipe);
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe(OfferV03Controller.prototype.handleGet.name, () => {
    it('returns offers filtered by lender address with mapped DTO shape', async () => {
      offerRepository.countBy.mockResolvedValue(1);
      offerRepository.findSortPaginateBy.mockResolvedValue([buildPgOffer()]);
      assetsFacade.getAssets.mockResolvedValue([
        buildAssetDto({
          name: 'MultiFaucet Test NFT',
          imageMediumUrl: 'https://example.com/medium.png',
          collection: buildCollectionDto({ name: 'MultiFaucet NFT' }),
          contract: '0xaaa',
          tokenId: '1'
        })
      ]);
      assetsFacade.getCollectionsByContract.mockResolvedValue([]);

      const response = await request(app.getHttpServer()).get(
        '/v0.3/offers?lenderAddress=0xa83114A443dA1CecEFC50368531cACE9F37fCCcb'
      );

      expect(response.status).toBe(200);
      expect(response.body.pagination).toEqual({ total: 1 });
      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0]).toMatchObject({
        id: '1',
        type: 'v3.asset',
        lender: { address: '0xa83114a443da1cecefc50368531cace9f37fcccb', nonce: '1' },
        borrower: { address: '0x0000000000000000000000000000000000000000' },
        nft: { id: '1', address: '0xaaa', name: 'MultiFaucet Test NFT' },
        terms: {
          loan: {
            duration: 86400,
            principal: 1000,
            repayment: 1001,
            apr: 37,
            currency: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
            interest: { prorated: false, bps: 10 }
          }
        },
        nftfi: { contract: { name: 'v2-3.loan.fixed' }, fee: { bps: 200 } },
        deleted: false
      });
      expect(response.body.results[0].signature).toBeNull();
    });

    it('exposes signature when the integrator owns the contract', async () => {
      offerRepository.countBy.mockResolvedValue(1);
      offerRepository.findSortPaginateBy.mockResolvedValue([
        buildPgOffer({ nftContract: '0xb8caa4d1284e92c6b46b4113be20b2cace1f634b' })
      ]);
      assetsFacade.getAssets.mockResolvedValue([]);
      assetsFacade.getCollectionsByContract.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/v0.3/offers?lenderAddress=0xa83114A443dA1CecEFC50368531cACE9F37fCCcb')
        .set('X-Api-Key', 'test-api-key');

      expect(response.status).toBe(200);
      expect(response.body.results[0].signature).toBe('0xsig');
    });
  });

  describe(OfferV03Controller.prototype.handlePost.name, () => {
    it('persists a new asset offer to Postgres and notifies the borrower', async () => {
      offerRepository.countBy.mockResolvedValue(0);
      assetsFacade.getCollectionsByContract.mockResolvedValue([
        buildCollectionDto({ id: 99, contract: '0xaaa', tokenRange: '0:1000' })
      ]);
      assetsFacade.getAssets.mockResolvedValue([
        buildAssetDto({ contract: '0xaaa', tokenId: '1', collection: buildCollectionDto({ id: 99 }) })
      ]);
      offerRepository.create.mockImplementation(async (draft: Partial<Offer>) => buildPgOffer({ ...draft } as Offer));

      const response = await request(app.getHttpServer())
        .post('/v0.3/offers')
        .send({
          type: 'v3.asset',
          lender: { address: '0xa83114A443dA1CecEFC50368531cACE9F37fCCcb', nonce: '7' },
          borrower: { address: '0x0000000000000000000000000000000000000000' },
          nft: { id: '1', address: '0xaaa' },
          terms: {
            loan: {
              duration: 86400,
              principal: 1000,
              repayment: 1001,
              origination: 0,
              currency: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
              expiry: 9999999999,
              interest: { prorated: false, bps: 10 }
            }
          },
          signature: '0xsig'
        });

      expect(response.status).toBe(201);
      expect(offerRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: OfferType.Asset,
          lender: '0xa83114A443dA1CecEFC50368531cACE9F37fCCcb',
          nftContract: '0xaaa',
          nftTokenIdFrom: '1',
          nftTokenIdTo: '1',
          collection: { id: 99 },
          principal: '1000',
          repaymentMax: '1001'
        })
      );
      expect(notificationService.notifyBorrowerReceivedOffer).toHaveBeenCalled();
    });

    it('rejects when the offer limit per lender is reached', async () => {
      offerRepository.countBy.mockResolvedValue(5);
      assetsFacade.getCollectionsByContract.mockResolvedValue([
        buildCollectionDto({ id: 99, contract: '0xaaa', tokenRange: '0:1000' })
      ]);

      const response = await request(app.getHttpServer())
        .post('/v0.3/offers')
        .send({
          type: 'v3.asset',
          lender: { address: '0xa83114A443dA1CecEFC50368531cACE9F37fCCcb', nonce: '7' },
          nft: { id: '1', address: '0xaaa' },
          terms: {
            loan: {
              duration: 86400,
              principal: 1000,
              repayment: 1001,
              origination: 0,
              currency: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
              expiry: 9999999999,
              interest: { prorated: false, bps: 10 }
            }
          },
          signature: '0xsig'
        });

      expect(response.status).toBe(422);
      expect(offerRepository.create).not.toHaveBeenCalled();
    });
  });
});
