import { INestApplication } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { omit } from 'lodash';
import request from 'supertest';
import { SupportedCurrencies } from '@nftfi.api/core';
import { AssetsFacade } from '@nftfi.api/facades/assets';
import { GnosisFacade } from '@nftfi.api/facades/gnosis';
import { OffersFacade } from '@nftfi.api/facades/offers';
import { AssetContract } from '@nftfi.api/services/assets';
import { buildAssetDto, buildCollectionDto } from '@nftfi.api/services/assets/factories';
import { Collection } from '@nftfi.api/repositories/postgres/collection';
import { Offer, OfferRepository, OfferType } from '@nftfi.api/repositories/postgres/offer';
import { MarketLoanRepository } from '@nftfi.api/repositories/postgres/market-loan';
import { httpValidationPipe } from '@nftfi.api/validation';
import { AuthService, AuthModuleConfigToken, type AuthTokenPayload } from '@nftfi.api/modules/auth-guard';
import { OfferV1Controller, OfferV1Service } from '../src/offer-v1';
import { OfferV1DurationValidationPipe, OfferV1LimitValidationPipe } from '../src/offer-v1/pipes';
import { OfferNotificationService } from '../src/offer-notification';

describe(OfferV1Controller.name, () => {
  let app: INestApplication;
  let offerRepository: OfferRepository;
  let marketLoanRepository: MarketLoanRepository;
  let assetsFacade: AssetsFacade;
  let assetContract: AssetContract;
  let gnosisFacade: GnosisFacade;
  let offerNotificationService: OfferNotificationService;
  let jwtService: JwtService;
  let cacheClient: { keys: jest.Mock; del: jest.Mock };
  let offersFacade: { invalidateCache: jest.Mock; deleteWinningOffer: jest.Mock };

  const authPayload: AuthTokenPayload = {
    account: '0x80d16553493c2ff84b6f0f32b8561d39c7b3af22',
    multisig: {},
    iat: 1700000000,
    exp: 1700000900
  };
  const jwtToken = `test.${Buffer.from(JSON.stringify(authPayload)).toString('base64')}.test`;

  beforeEach(async () => {
    jest.resetAllMocks();

    cacheClient = { keys: jest.fn().mockResolvedValue([]), del: jest.fn().mockResolvedValue(0) };
    offersFacade = { invalidateCache: jest.fn().mockResolvedValue(undefined), deleteWinningOffer: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            (): object => ({
              validation: {
                minimumLoanDurationSeconds: 86400,
                createLimit: {
                  [OfferType.Asset]: 5,
                  [OfferType.Collection]: 5
                }
              },
              pagination: { limit: 100, page: 1 },
              integrators: JSON.stringify([
                {
                  integrator: '0x5f79bd35435a7b98493543db0fec7f55292e9e77',
                  apiKeys: ['test-api-key'],
                  nftAddresses: ['0x145c5e0f3099dff40671d988c30b0e05f5279789']
                }
              ]),
              contracts: { nftfi: { escrowV3: '0x2ae3e46290ade43593eabd15642ebd67157f5351' } }
            })
          ]
        })
      ],
      controllers: [OfferV1Controller],
      providers: [
        OfferV1Service,
        OfferV1DurationValidationPipe,
        OfferV1LimitValidationPipe,
        AuthService,
        {
          provide: OfferRepository,
          useValue: {
            create: jest.fn(),
            count: jest.fn(),
            countBy: jest.fn(),
            findSortPaginateBy: jest.fn(),
            findById: jest.fn(),
            softDelete: jest.fn()
          }
        },
        {
          provide: MarketLoanRepository,
          useValue: {
            find: jest.fn()
          }
        },
        {
          provide: AssetsFacade,
          useValue: {
            getAssets: jest.fn(),
            getCollectionsByContract: jest.fn()
          }
        },
        {
          provide: AssetContract,
          useValue: {
            isOwnerOf: jest.fn()
          }
        },
        {
          provide: OfferNotificationService,
          useValue: {
            notifyBorrowerReceivedOffer: jest.fn()
          }
        },
        {
          provide: SupportedCurrencies,
          useValue: new SupportedCurrencies({
            WETH: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
            DAI: '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844',
            USDC: '0x07865c6e87b9f70255377e024ace6630c1eaa37f'
          })
        },
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn() }
        },
        {
          provide: AuthModuleConfigToken,
          useValue: { secret: 'test-secret' }
        },
        {
          provide: GnosisFacade,
          useValue: { getSafes: jest.fn().mockResolvedValue([]) }
        },
        {
          provide: CACHE_MANAGER,
          useValue: { store: { client: cacheClient } }
        },
        {
          provide: OffersFacade,
          useValue: offersFacade
        }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(httpValidationPipe);

    offerRepository = moduleRef.get(OfferRepository);
    marketLoanRepository = moduleRef.get(MarketLoanRepository);
    assetsFacade = moduleRef.get(AssetsFacade);
    assetContract = moduleRef.get(AssetContract);
    gnosisFacade = moduleRef.get(GnosisFacade);
    offerNotificationService = moduleRef.get(OfferNotificationService);
    jwtService = moduleRef.get(JwtService);

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe(OfferV1Controller.prototype.handlePost.name, () => {
    const validAssetPayload = {
      type: OfferType.Asset,
      lender: {
        address: '0x80d16553493c2ff84b6f0f32b8561d39c7b3af22',
        nonce: '49892765596424156825497368575142519120070792129937605962128915115292440380731'
      },
      borrower: { address: '0x268699101bb18d80576975584a222b5732cf56f2' },
      signature:
        '0x1dbd50e2bf4ffb097fbf53fd8b88928ea3ff9d976d50b6b77f4a58c64847966b76acbe0a8babb771ac0c4db4c96ac949502ddc027a25b2ab2dc030bfa07a6d141c',
      nft: {
        contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
        tokenId: '1'
      },
      terms: {
        loan: {
          duration: 86400,
          principal: '7490000000000000000',
          repayment: '7512470000000000000',
          origination: '0',
          currency: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
          expiresAt: '2099-06-19T23:30:18.000Z',
          prorated: false
        }
      }
    };

    const validCollectionPayload = {
      ...validAssetPayload,
      type: OfferType.Collection,
      nft: {
        contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
        tokenId: { from: '1', to: '999' }
      }
    };

    const validContractPayload = {
      ...validAssetPayload,
      type: OfferType.Contract,
      nft: {
        contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789'
      }
    };

    const buildAssetOfferEntity = (overrides: Partial<Offer> = {}): Offer => ({
      id: 1,
      type: OfferType.Asset,
      borrower: '0x268699101bb18d80576975584a222b5732cf56f2',
      lender: '0x80d16553493c2ff84b6f0f32b8561d39c7b3af22',
      collection: { id: 1 } as Collection,
      lenderNonce: '49892765596424156825497368575142519120070792129937605962128915115292440380731',
      nftContract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
      nftTokenIdFrom: '1',
      nftTokenIdTo: '1',
      currency: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
      principal: '7490000000000000000',
      repaymentMax: '7512470000000000000',
      originationFee: '0',
      apr: 109.5,
      eapr: 109.5,
      duration: 86400,
      expiresAt: new Date('2099-06-19T23:30:18.000Z'),
      prorated: false,
      signature:
        '0x1dbd50e2bf4ffb097fbf53fd8b88928ea3ff9d976d50b6b77f4a58c64847966b76acbe0a8babb771ac0c4db4c96ac949502ddc027a25b2ab2dc030bfa07a6d141c',
      createdAt: new Date('2024-04-10T21:29:34.000Z'),
      updatedAt: new Date('2024-04-10T21:29:34.000Z'),
      ...overrides
    });

    it('creates the offer without enforcing lender check when Authorization header is missing', async () => {
      jest.spyOn(offerRepository, 'count').mockResolvedValue(0);
      const fnCreate = jest.spyOn(offerRepository, 'create').mockResolvedValue(buildAssetOfferEntity());
      jest.spyOn(offerNotificationService, 'notifyBorrowerReceivedOffer').mockResolvedValue();
      jest.spyOn(assetsFacade, 'getAssets').mockResolvedValue([
        buildAssetDto({
          contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
          tokenId: '1'
        })
      ]);
      jest.spyOn(assetsFacade, 'getCollectionsByContract').mockResolvedValue([
        buildCollectionDto({
          contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
          tokenRange: '0:9999'
        })
      ]);

      const response = await request(app.getHttpServer())
        .post('/v1/offers')
        .send({
          ...validAssetPayload,
          lender: { ...validAssetPayload.lender, address: '0x1111111111111111111111111111111111111111' }
        });

      expect(response.status).toBe(201);
      expect(fnCreate).toHaveBeenCalledTimes(1);
    });

    it('returns 401 when JWT verification fails', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(new Error('invalid'));
      const fnCreate = jest.spyOn(offerRepository, 'create');

      const response = await request(app.getHttpServer())
        .post('/v1/offers')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(validAssetPayload);

      expect(response.status).toBe(401);
      expect(fnCreate).not.toHaveBeenCalled();
    });

    it('returns 401 when lender does not match the authenticated account', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(authPayload);
      jest.spyOn(offerRepository, 'count').mockResolvedValue(0);
      const fnCreate = jest.spyOn(offerRepository, 'create');

      const response = await request(app.getHttpServer())
        .post('/v1/offers')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          ...validAssetPayload,
          lender: { ...validAssetPayload.lender, address: '0x1111111111111111111111111111111111111111' }
        });

      expect(response.status).toBe(401);
      expect(response.body.errors).toEqual({ lender: ['Offer lender must match the authenticated account'] });
      expect(fnCreate).not.toHaveBeenCalled();
    });

    it('creates an asset offer and returns 201 with dto', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(authPayload);
      jest.spyOn(offerRepository, 'count').mockResolvedValue(0);
      const fnCreate = jest.spyOn(offerRepository, 'create').mockResolvedValue(buildAssetOfferEntity());
      const fnNotify = jest.spyOn(offerNotificationService, 'notifyBorrowerReceivedOffer').mockResolvedValue();
      const collection = buildCollectionDto({
        contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
        name: 'MultiFaucet NFT',
        tokenRange: '0:9999'
      });
      const fnGetAssets = jest.spyOn(assetsFacade, 'getAssets').mockResolvedValue([
        buildAssetDto({
          contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
          tokenId: '1',
          name: 'MultiFaucet Test NFT',
          imageMediumUrl: 'https://example.com/medium.png',
          collection: buildCollectionDto({ name: 'MultiFaucet NFT' })
        })
      ]);
      const fnGetCollections = jest.spyOn(assetsFacade, 'getCollectionsByContract').mockResolvedValue([collection]);

      const response = await request(app.getHttpServer())
        .post('/v1/offers')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(validAssetPayload);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: 1,
        type: 'asset',
        status: 'active',
        lender: {
          address: '0x80d16553493c2ff84b6f0f32b8561d39c7b3af22',
          nonce: '49892765596424156825497368575142519120070792129937605962128915115292440380731'
        },
        borrower: { address: '0x268699101bb18d80576975584a222b5732cf56f2' },
        collection: {
          id: 1,
          contract: '0x1234567890abcdef1234567890abcdef12345678',
          name: 'MultiFaucet NFT',
          ranking: 1,
          imageUrl: 'https://example.com/image.png',
          tokenRange: '1000:1999',
          tokenSupply: '1000',
          tokenStandard: 'erc721',
          whitelisted: true,
          stats: null,
          floor: null
        },
        asset: {
          id: 1,
          contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
          tokenId: '1',
          owners: ['0x000000000000000000000000000000000000000000'],
          name: 'MultiFaucet Test NFT',
          imageSmallUrl: 'https://example.com/small.png',
          imageMediumUrl: 'https://example.com/medium.png',
          collection: {
            id: 1,
            contract: '0x1234567890abcdef1234567890abcdef12345678',
            name: 'MultiFaucet NFT',
            ranking: 1,
            imageUrl: 'https://example.com/image.png',
            tokenRange: '1000:1999',
            tokenSupply: '1000',
            tokenStandard: 'erc721',
            whitelisted: true,
            stats: null,
            floor: null
          }
        },
        tokenRange: { from: '1', to: '1' },
        terms: {
          loan: {
            duration: 86400,
            principal: '7490000000000000000',
            repayment: '7512470000000000000',
            origination: '0',
            currency: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
            expiresAt: '2099-06-19T23:30:18.000Z',
            apr: 109.5,
            eapr: 109.5,
            prorated: false,
            unit: 'ether'
          }
        },
        signature:
          '0x1dbd50e2bf4ffb097fbf53fd8b88928ea3ff9d976d50b6b77f4a58c64847966b76acbe0a8babb771ac0c4db4c96ac949502ddc027a25b2ab2dc030bfa07a6d141c',
        createdAt: '2024-04-10T21:29:34.000Z'
      });
      expect(fnCreate).toHaveBeenCalledTimes(1);
      expect(fnCreate).toHaveBeenCalledWith({
        type: 'asset',
        lender: '0x80d16553493c2ff84b6f0f32b8561d39c7b3af22',
        lenderNonce: '49892765596424156825497368575142519120070792129937605962128915115292440380731',
        borrower: '0x268699101bb18d80576975584a222b5732cf56f2',
        nftContract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
        nftTokenIdFrom: '1',
        nftTokenIdTo: '1',
        collection: { id: 1 },
        currency: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
        principal: '7490000000000000000',
        repaymentMax: '7512470000000000000',
        originationFee: '0',
        apr: 109.5,
        eapr: 109.5,
        duration: 86400,
        expiresAt: new Date('2099-06-19T23:30:18.000Z'),
        prorated: false,
        signature:
          '0x1dbd50e2bf4ffb097fbf53fd8b88928ea3ff9d976d50b6b77f4a58c64847966b76acbe0a8babb771ac0c4db4c96ac949502ddc027a25b2ab2dc030bfa07a6d141c'
      });
      expect(fnNotify).toHaveBeenCalledTimes(1);
      expect(fnGetAssets).toHaveBeenCalledWith({
        keys: [{ contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789', tokenId: '1' }]
      });
      expect(fnGetCollections).toHaveBeenCalledWith('0x145c5e0f3099dff40671d988c30b0e05f5279789');
      expect(offersFacade.invalidateCache).toHaveBeenCalledTimes(1);
    });

    it('defaults borrower address to zero address when omitted', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(authPayload);
      jest.spyOn(offerRepository, 'count').mockResolvedValue(0);
      const fnCreate = jest
        .spyOn(offerRepository, 'create')
        .mockResolvedValue(buildAssetOfferEntity({ borrower: '0x0000000000000000000000000000000000000000' }));
      jest.spyOn(offerNotificationService, 'notifyBorrowerReceivedOffer').mockResolvedValue();
      jest.spyOn(assetsFacade, 'getAssets').mockResolvedValue([
        buildAssetDto({
          contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
          tokenId: '1'
        })
      ]);
      jest.spyOn(assetsFacade, 'getCollectionsByContract').mockResolvedValue([
        buildCollectionDto({
          contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
          tokenRange: '0:9999'
        })
      ]);

      const response = await request(app.getHttpServer())
        .post('/v1/offers')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(omit(validAssetPayload, ['borrower']));

      expect(response.status).toBe(201);
      expect(response.body.borrower).toEqual({ address: '0x0000000000000000000000000000000000000000' });
      expect(fnCreate).toHaveBeenCalledWith(
        expect.objectContaining({ borrower: '0x0000000000000000000000000000000000000000' })
      );
    });

    it('creates a collection offer using closest collection metadata', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(authPayload);
      jest.spyOn(offerRepository, 'count').mockResolvedValue(0);
      jest.spyOn(offerRepository, 'create').mockResolvedValue(
        buildAssetOfferEntity({
          type: OfferType.Collection,
          nftTokenIdFrom: '1',
          nftTokenIdTo: '999'
        })
      );
      jest.spyOn(offerNotificationService, 'notifyBorrowerReceivedOffer').mockResolvedValue();
      const fnGetAssets = jest.spyOn(assetsFacade, 'getAssets');
      const collection = buildCollectionDto({
        name: 'MultiFaucet NFT',
        contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
        imageUrl: 'https://example.com/image.png',
        tokenRange: '0:9999'
      });
      const fnGetCollections = jest.spyOn(assetsFacade, 'getCollectionsByContract').mockResolvedValue([collection]);

      const response = await request(app.getHttpServer())
        .post('/v1/offers')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(validCollectionPayload);

      expect(response.status).toBe(201);
      expect(response.body.type).toBe('collection');
      expect(response.body.asset).toBeUndefined();
      expect(response.body.collection).toEqual({
        id: 1,
        contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
        name: 'MultiFaucet NFT',
        ranking: 1,
        imageUrl: 'https://example.com/image.png',
        tokenRange: '0:9999',
        tokenSupply: '1000',
        tokenStandard: 'erc721',
        whitelisted: true,
        stats: null,
        floor: null
      });
      expect(response.body.tokenRange).toEqual({ from: '1', to: '999' });
      expect(fnGetAssets).not.toHaveBeenCalled();
      expect(fnGetCollections).toHaveBeenCalledWith('0x145c5e0f3099dff40671d988c30b0e05f5279789');
    });

    it('creates a contract offer returning the first collection for the contract', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(authPayload);
      jest.spyOn(offerRepository, 'count').mockResolvedValue(0);
      const fnCreate = jest.spyOn(offerRepository, 'create').mockResolvedValue(
        buildAssetOfferEntity({
          type: OfferType.Contract,
          nftTokenIdFrom: '0',
          nftTokenIdTo: '0'
        })
      );
      jest.spyOn(offerNotificationService, 'notifyBorrowerReceivedOffer').mockResolvedValue();
      const fnGetAssets = jest.spyOn(assetsFacade, 'getAssets');
      const fnGetClosest = jest.spyOn(AssetsFacade, 'getClosestCollectionToTokenId');
      const firstCollection = buildCollectionDto({
        id: 1,
        name: 'First Collection',
        contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
        tokenRange: '0:999'
      });
      const secondCollection = buildCollectionDto({
        id: 2,
        name: 'Second Collection',
        contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
        tokenRange: '1000:1999'
      });
      const fnGetCollections = jest
        .spyOn(assetsFacade, 'getCollectionsByContract')
        .mockResolvedValue([firstCollection, secondCollection]);

      const response = await request(app.getHttpServer())
        .post('/v1/offers')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(validContractPayload);

      expect(response.status).toBe(201);
      expect(response.body.type).toBe('contract');
      expect(response.body.asset).toBeUndefined();
      expect(response.body.collection).toEqual({
        id: 1,
        contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
        name: 'First Collection',
        ranking: 1,
        imageUrl: 'https://example.com/image.png',
        tokenRange: '0:999',
        tokenSupply: '1000',
        tokenStandard: 'erc721',
        whitelisted: true,
        stats: null,
        floor: null
      });
      expect(fnCreate).toHaveBeenCalledWith(expect.objectContaining({ type: 'contract' }));
      expect(fnGetAssets).not.toHaveBeenCalled();
      expect(fnGetClosest).not.toHaveBeenCalled();
      expect(fnGetCollections).toHaveBeenCalledWith('0x145c5e0f3099dff40671d988c30b0e05f5279789');
    });

    it('returns 422 when no collection is registered for the contract', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(authPayload);
      jest.spyOn(offerRepository, 'count').mockResolvedValue(0);
      const fnCreate = jest.spyOn(offerRepository, 'create');
      jest.spyOn(assetsFacade, 'getCollectionsByContract').mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .post('/v1/offers')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(validAssetPayload);

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual({
        'nft.contract': ['No collection found for contract 0x145c5e0f3099dff40671d988c30b0e05f5279789']
      });
      expect(fnCreate).not.toHaveBeenCalled();
    });

    it('returns 422 when collection offer range is not within any collection', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(authPayload);
      jest.spyOn(offerRepository, 'count').mockResolvedValue(0);
      const fnCreate = jest.spyOn(offerRepository, 'create');
      jest.spyOn(assetsFacade, 'getCollectionsByContract').mockResolvedValue([
        buildCollectionDto({
          contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
          tokenRange: '0:9'
        })
      ]);

      const response = await request(app.getHttpServer())
        .post('/v1/offers')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          ...validCollectionPayload,
          nft: {
            contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
            tokenId: { from: '5', to: '500' }
          }
        });

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual({
        'nft.tokenId': [
          'Token range 5:500 is not within any collection of contract 0x145c5e0f3099dff40671d988c30b0e05f5279789'
        ]
      });
      expect(fnCreate).not.toHaveBeenCalled();
    });

    it('returns 422 when loan duration is less than the minimum', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(authPayload);
      const fnCreate = jest.spyOn(offerRepository, 'create');
      const fnCount = jest.spyOn(offerRepository, 'count');

      const response = await request(app.getHttpServer())
        .post('/v1/offers')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          ...validAssetPayload,
          terms: {
            loan: { ...validAssetPayload.terms.loan, duration: 100 }
          }
        });

      expect(response.status).toBe(422);
      expect(response.body).toEqual({
        errors: {
          'terms.loan.duration': [
            'duration must be specified in seconds, and in 86400 seconds increments (eg. 86400, 172800, 259200)'
          ]
        }
      });
      expect(fnCreate).not.toHaveBeenCalled();
      expect(fnCount).not.toHaveBeenCalled();
    });

    it('returns 422 when loan duration is not a multiple of the minimum', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(authPayload);
      const fnCreate = jest.spyOn(offerRepository, 'create');

      const response = await request(app.getHttpServer())
        .post('/v1/offers')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          ...validAssetPayload,
          terms: {
            loan: { ...validAssetPayload.terms.loan, duration: 172801 }
          }
        });

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual({
        'terms.loan.duration': [
          'duration must be specified in seconds, and in 86400 seconds increments (eg. 86400, 172800, 259200)'
        ]
      });
      expect(fnCreate).not.toHaveBeenCalled();
    });

    it('returns 422 when lender has reached the asset offer limit', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(authPayload);
      const fnCount = jest.spyOn(offerRepository, 'count').mockResolvedValue(5);
      const fnCreate = jest.spyOn(offerRepository, 'create');

      const response = await request(app.getHttpServer())
        .post('/v1/offers')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(validAssetPayload);

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual({
        limit: ['Cannot make more than 5 offers per lender, per currency, per loan type and per asset']
      });
      expect(fnCount).toHaveBeenCalledWith({
        type: 'asset',
        lender: '0x80d16553493c2ff84b6f0f32b8561d39c7b3af22',
        nftContract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
        currency: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
        prorated: false,
        nftTokenIdFrom: '1'
      });
      expect(fnCreate).not.toHaveBeenCalled();
    });

    it('returns 422 when lender has reached the collection offer limit', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(authPayload);
      const fnCount = jest.spyOn(offerRepository, 'count').mockResolvedValue(5);
      const fnCreate = jest.spyOn(offerRepository, 'create');

      const response = await request(app.getHttpServer())
        .post('/v1/offers')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(validCollectionPayload);

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual({
        limit: ['Cannot make more than 5 offers per lender, per currency, per loan type and per collection']
      });
      expect(fnCount).toHaveBeenCalledWith({
        type: 'collection',
        lender: '0x80d16553493c2ff84b6f0f32b8561d39c7b3af22',
        nftContract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
        currency: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
        prorated: false
      });
      expect(fnCreate).not.toHaveBeenCalled();
    });

    it('returns 422 when repayment is not greater than principal', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(authPayload);
      const fnCreate = jest.spyOn(offerRepository, 'create');

      const response = await request(app.getHttpServer())
        .post('/v1/offers')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          ...validAssetPayload,
          terms: {
            loan: {
              ...validAssetPayload.terms.loan,
              principal: '7512470000000000000',
              repayment: '7490000000000000000'
            }
          }
        });

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual({
        'terms.loan.repayment': ['repayment must be greater than principal']
      });
      expect(fnCreate).not.toHaveBeenCalled();
    });

    it('returns 422 when required fields are missing', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(authPayload);
      const fnCreate = jest.spyOn(offerRepository, 'create');

      const response = await request(app.getHttpServer())
        .post('/v1/offers')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({});

      expect(response.status).toBe(422);
      expect(response.body.errors).toBeDefined();
      expect(fnCreate).not.toHaveBeenCalled();
    });
  });

  describe(OfferV1Controller.prototype.handleGet.name, () => {
    const buildListOffer = (overrides: Partial<Offer> = {}): Offer => ({
      id: 1,
      type: OfferType.Asset,
      borrower: '0x268699101bb18d80576975584a222b5732cf56f2',
      lender: '0x80d16553493c2ff84b6f0f32b8561d39c7b3af22',
      collection: { id: 1 } as Collection,
      lenderNonce: '1',
      nftContract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
      nftTokenIdFrom: '1',
      nftTokenIdTo: '1',
      currency: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
      principal: '1000000000000000000',
      repaymentMax: '1100000000000000000',
      originationFee: '0',
      apr: 10,
      eapr: 10,
      duration: 86400,
      expiresAt: new Date('2033-05-18T03:33:19.000Z'),
      prorated: false,
      signature: '0xabc',
      createdAt: new Date('2024-04-10T21:29:34.000Z'),
      updatedAt: new Date('2024-04-10T21:29:34.000Z'),
      ...overrides
    });

    it('returns paginated offers redacted for anonymous callers', async () => {
      const offer = buildListOffer();
      const fnCountBy = jest.spyOn(offerRepository, 'countBy').mockResolvedValue(1);
      const fnFind = jest.spyOn(offerRepository, 'findSortPaginateBy').mockResolvedValue([offer]);
      jest.spyOn(assetsFacade, 'getAssets').mockResolvedValue([
        buildAssetDto({
          contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
          tokenId: '1',
          name: 'MultiFaucet Test NFT',
          imageMediumUrl: 'https://example.com/medium.png',
          collection: buildCollectionDto({ name: 'MultiFaucet NFT' })
        })
      ]);
      const collection = buildCollectionDto({
        contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
        name: 'MultiFaucet NFT'
      });
      jest.spyOn(assetsFacade, 'getCollectionsByContract').mockResolvedValue([collection]);
      jest.spyOn(AssetsFacade, 'getClosestCollectionToTokenId').mockReturnValue(collection);
      jest.spyOn(assetContract, 'isOwnerOf').mockResolvedValue(false);

      const response = await request(app.getHttpServer()).get(
        '/v1/offers?lender=0x80d16553493c2ff84b6f0f32b8561d39c7b3af22'
      );

      expect(response.status).toBe(200);
      expect(response.headers['x-pagination-total']).toBe('1');
      expect(response.headers['x-pagination-page']).toBe('1');
      expect(response.headers['x-pagination-limit']).toBe('100');
      expect(response.body).toHaveLength(1);
      expect(response.body[0].signature).toBeNull();
      expect(response.body[0].asset).toEqual({
        id: 1,
        contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
        tokenId: '1',
        owners: ['0x000000000000000000000000000000000000000000'],
        name: 'MultiFaucet Test NFT',
        imageSmallUrl: 'https://example.com/small.png',
        imageMediumUrl: 'https://example.com/medium.png',
        collection: {
          id: 1,
          contract: '0x1234567890abcdef1234567890abcdef12345678',
          name: 'MultiFaucet NFT',
          ranking: 1,
          imageUrl: 'https://example.com/image.png',
          tokenRange: '1000:1999',
          tokenSupply: '1000',
          tokenStandard: 'erc721',
          whitelisted: true,
          stats: null,
          floor: null
        }
      });
      expect(response.body[0].collection).toEqual({
        id: 1,
        contract: '0x1234567890abcdef1234567890abcdef12345678',
        name: 'MultiFaucet NFT',
        ranking: 1,
        imageUrl: 'https://example.com/image.png',
        tokenRange: '1000:1999',
        tokenSupply: '1000',
        tokenStandard: 'erc721',
        whitelisted: true,
        stats: null,
        floor: null
      });
      expect(fnCountBy).toHaveBeenCalledWith(
        expect.objectContaining({ lender: '0x80d16553493c2ff84b6f0f32b8561d39c7b3af22' })
      );
      expect(fnCountBy.mock.calls[0][0].withDeleted).toBeUndefined();
      expect(fnFind).toHaveBeenCalledWith(
        expect.objectContaining({ lender: '0x80d16553493c2ff84b6f0f32b8561d39c7b3af22' }),
        { skip: 0, limit: 100, sort: { by: 'createdAt', direction: 'DESC' } }
      );
    });

    it('keeps signature for the borrower', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(authPayload);
      const offer = buildListOffer({ borrower: authPayload.account });
      jest.spyOn(offerRepository, 'countBy').mockResolvedValue(1);
      jest.spyOn(offerRepository, 'findSortPaginateBy').mockResolvedValue([offer]);
      jest.spyOn(assetsFacade, 'getAssets').mockResolvedValue([
        buildAssetDto({
          contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
          tokenId: '1'
        })
      ]);
      jest.spyOn(assetsFacade, 'getCollectionsByContract').mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/v1/offers?lender=0x80d16553493c2ff84b6f0f32b8561d39c7b3af22')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(response.status).toBe(200);
      expect(response.body[0].signature).toBe('0xabc');
    });

    it('returns deleted status when the offer has a deletedAt timestamp', async () => {
      const offer = buildListOffer({ deletedAt: new Date('2024-04-10T21:29:34.000Z') });
      jest.spyOn(offerRepository, 'countBy').mockResolvedValue(1);
      jest.spyOn(offerRepository, 'findSortPaginateBy').mockResolvedValue([offer]);
      jest
        .spyOn(assetsFacade, 'getAssets')
        .mockResolvedValue([buildAssetDto({ contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789', tokenId: '1' })]);
      jest.spyOn(assetsFacade, 'getCollectionsByContract').mockResolvedValue([]);

      const response = await request(app.getHttpServer()).get(
        '/v1/offers?lender=0x80d16553493c2ff84b6f0f32b8561d39c7b3af22'
      );

      expect(response.status).toBe(200);
      expect(response.body[0].status).toBe('deleted');
    });

    it('returns active status when the offer has no deletedAt', async () => {
      jest.spyOn(offerRepository, 'countBy').mockResolvedValue(1);
      jest.spyOn(offerRepository, 'findSortPaginateBy').mockResolvedValue([buildListOffer()]);
      jest
        .spyOn(assetsFacade, 'getAssets')
        .mockResolvedValue([buildAssetDto({ contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789', tokenId: '1' })]);
      jest.spyOn(assetsFacade, 'getCollectionsByContract').mockResolvedValue([]);

      const response = await request(app.getHttpServer()).get(
        '/v1/offers?lender=0x80d16553493c2ff84b6f0f32b8561d39c7b3af22'
      );

      expect(response.status).toBe(200);
      expect(response.body[0].status).toBe('active');
    });

    it('keeps signature when caller is the NFT owner', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(authPayload);
      jest.spyOn(offerRepository, 'countBy').mockResolvedValue(1);
      jest.spyOn(offerRepository, 'findSortPaginateBy').mockResolvedValue([buildListOffer()]);
      jest.spyOn(assetsFacade, 'getAssets').mockResolvedValue([
        buildAssetDto({
          contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
          tokenId: '1'
        })
      ]);
      jest.spyOn(assetsFacade, 'getCollectionsByContract').mockResolvedValue([]);
      jest.spyOn(assetContract, 'isOwnerOf').mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .get('/v1/offers?lender=0x80d16553493c2ff84b6f0f32b8561d39c7b3af22')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(response.status).toBe(200);
      expect(response.body[0].signature).toBe('0xabc');
      expect(assetContract.isOwnerOf).toHaveBeenCalledWith(
        '0x145c5e0f3099dff40671d988c30b0e05f5279789',
        '1',
        '0x80d16553493c2ff84b6f0f32b8561d39c7b3af22'
      );
    });

    it('keeps signature when caller is an integrator contract owner', async () => {
      jest.spyOn(offerRepository, 'countBy').mockResolvedValue(1);
      jest.spyOn(offerRepository, 'findSortPaginateBy').mockResolvedValue([buildListOffer()]);
      jest.spyOn(assetsFacade, 'getAssets').mockResolvedValue([
        buildAssetDto({
          contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
          tokenId: '1'
        })
      ]);
      jest.spyOn(assetsFacade, 'getCollectionsByContract').mockResolvedValue([]);
      jest.spyOn(assetContract, 'isOwnerOf').mockResolvedValue(false);

      const response = await request(app.getHttpServer())
        .get('/v1/offers?lender=0x80d16553493c2ff84b6f0f32b8561d39c7b3af22')
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(200);
      expect(response.body[0].signature).toBe('0xabc');
    });

    it('does not redact collection offers', async () => {
      const offer = buildListOffer({
        type: OfferType.Collection,
        nftTokenIdFrom: '1',
        nftTokenIdTo: '999'
      });
      jest.spyOn(offerRepository, 'countBy').mockResolvedValue(1);
      jest.spyOn(offerRepository, 'findSortPaginateBy').mockResolvedValue([offer]);
      const collection = buildCollectionDto({
        contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
        name: 'MultiFaucet NFT'
      });
      jest.spyOn(assetsFacade, 'getCollectionsByContract').mockResolvedValue([collection]);
      jest.spyOn(AssetsFacade, 'getClosestCollectionToTokenId').mockReturnValue(collection);
      const fnIsOwnerOf = jest.spyOn(assetContract, 'isOwnerOf');

      const response = await request(app.getHttpServer()).get(
        '/v1/offers?lender=0x80d16553493c2ff84b6f0f32b8561d39c7b3af22'
      );

      expect(response.status).toBe(200);
      expect(response.body[0].signature).toBe('0xabc');
      expect(fnIsOwnerOf).not.toHaveBeenCalled();
    });

    it('does not redact contract offers', async () => {
      const offer = buildListOffer({
        type: OfferType.Contract,
        nftTokenIdFrom: '0',
        nftTokenIdTo: '0'
      });
      jest.spyOn(offerRepository, 'countBy').mockResolvedValue(1);
      jest.spyOn(offerRepository, 'findSortPaginateBy').mockResolvedValue([offer]);
      const collection = buildCollectionDto({
        contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
        name: 'MultiFaucet NFT'
      });
      jest.spyOn(assetsFacade, 'getCollectionsByContract').mockResolvedValue([collection]);
      const fnIsOwnerOf = jest.spyOn(assetContract, 'isOwnerOf');

      const response = await request(app.getHttpServer()).get(
        '/v1/offers?lender=0x80d16553493c2ff84b6f0f32b8561d39c7b3af22'
      );

      expect(response.status).toBe(200);
      expect(response.body[0].signature).toBe('0xabc');
      expect(response.body[0].type).toBe('contract');
      expect(fnIsOwnerOf).not.toHaveBeenCalled();
    });

    it('keeps signature when caller owns the gnosis safe that is the borrower', async () => {
      const gnosisAuthPayload: AuthTokenPayload = {
        ...authPayload,
        multisig: { type: 'gnosis' }
      };
      const gnosisJwtToken = `test.${Buffer.from(JSON.stringify(gnosisAuthPayload)).toString('base64')}.test`;
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(gnosisAuthPayload);
      jest.spyOn(offerRepository, 'countBy').mockResolvedValue(1);
      jest
        .spyOn(offerRepository, 'findSortPaginateBy')
        .mockResolvedValue([buildListOffer({ borrower: '0xsafe000000000000000000000000000000000000' })]);
      jest.spyOn(assetsFacade, 'getAssets').mockResolvedValue([
        buildAssetDto({
          contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
          tokenId: '1'
        })
      ]);
      jest.spyOn(assetsFacade, 'getCollectionsByContract').mockResolvedValue([]);
      const fnGetSafes = jest
        .spyOn(gnosisFacade, 'getSafes')
        .mockResolvedValue(['0xsafe000000000000000000000000000000000000']);

      const response = await request(app.getHttpServer())
        .get('/v1/offers?lender=0x80d16553493c2ff84b6f0f32b8561d39c7b3af22')
        .set('Authorization', `Bearer ${gnosisJwtToken}`);

      expect(response.status).toBe(200);
      expect(response.body[0].signature).toBe('0xabc');
      expect(fnGetSafes).toHaveBeenCalledWith('0x80d16553493c2ff84b6f0f32b8561d39c7b3af22');
    });

    it('redacts signature for escrow borrower when no active loan is found', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(authPayload);
      const offer = buildListOffer({ borrower: '0x2ae3e46290ade43593eabd15642ebd67157f5351' });
      jest.spyOn(offerRepository, 'countBy').mockResolvedValue(1);
      jest.spyOn(offerRepository, 'findSortPaginateBy').mockResolvedValue([offer]);
      jest.spyOn(assetsFacade, 'getAssets').mockResolvedValue([
        buildAssetDto({
          contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
          tokenId: '1'
        })
      ]);
      jest.spyOn(assetsFacade, 'getCollectionsByContract').mockResolvedValue([]);
      jest.spyOn(marketLoanRepository, 'find').mockResolvedValue([]);
      jest.spyOn(assetContract, 'isOwnerOf').mockResolvedValue(false);

      const response = await request(app.getHttpServer())
        .get('/v1/offers?lender=0x80d16553493c2ff84b6f0f32b8561d39c7b3af22')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(response.status).toBe(200);
      expect(response.body[0].signature).toBeNull();
    });

    it('resolves escrow borrower via market loan lookup', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(authPayload);
      const offer = buildListOffer({ borrower: '0x2ae3e46290ade43593eabd15642ebd67157f5351' });
      jest.spyOn(offerRepository, 'countBy').mockResolvedValue(1);
      jest.spyOn(offerRepository, 'findSortPaginateBy').mockResolvedValue([offer]);
      jest.spyOn(assetsFacade, 'getAssets').mockResolvedValue([
        buildAssetDto({
          contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
          tokenId: '1'
        })
      ]);
      jest.spyOn(assetsFacade, 'getCollectionsByContract').mockResolvedValue([]);
      const fnFindLoan = jest.spyOn(marketLoanRepository, 'find').mockResolvedValue([
        {
          borrower: authPayload.account
        } as unknown as Awaited<ReturnType<typeof marketLoanRepository.find>>[number]
      ]);

      const response = await request(app.getHttpServer())
        .get('/v1/offers?lender=0x80d16553493c2ff84b6f0f32b8561d39c7b3af22')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(response.status).toBe(200);
      expect(response.body[0].signature).toBe('0xabc');
      expect(fnFindLoan).toHaveBeenCalledWith(
        {
          statuses: ['active'],
          nftContracts: ['0x145c5e0f3099dff40671d988c30b0e05f5279789'],
          nftIds: ['1']
        },
        { skip: 0, limit: 1, sort: { by: 'startedAt', direction: 'DESC' } }
      );
    });

    it('includes deleted offers only for authenticated lender self-query', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(authPayload);
      jest.spyOn(offerRepository, 'countBy').mockResolvedValue(0);
      jest.spyOn(offerRepository, 'findSortPaginateBy').mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/v1/offers?lender=0x80d16553493c2ff84b6f0f32b8561d39c7b3af22&withDeleted=true')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      const [filtersArg] = (offerRepository.countBy as jest.Mock).mock.calls[0];
      expect(filtersArg.withDeleted).toBe(true);
    });

    it('does not set withDeleted when caller is not the lender', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(authPayload);
      jest.spyOn(offerRepository, 'countBy').mockResolvedValue(0);
      jest.spyOn(offerRepository, 'findSortPaginateBy').mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/v1/offers?lender=0x111111111111111111111111111111111111aaaa&withDeleted=true')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      const [filtersArg] = (offerRepository.countBy as jest.Mock).mock.calls[0];
      expect(filtersArg.withDeleted).toBeUndefined();
    });

    it('redacts signature when the ownership check throws', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(authPayload);
      jest.spyOn(offerRepository, 'countBy').mockResolvedValue(1);
      jest
        .spyOn(offerRepository, 'findSortPaginateBy')
        .mockResolvedValue([buildListOffer({ borrower: '0xffffffffffffffffffffffffffffffffffffffff' })]);
      jest
        .spyOn(assetsFacade, 'getAssets')
        .mockResolvedValue([buildAssetDto({ contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789', tokenId: '1' })]);
      jest.spyOn(assetsFacade, 'getCollectionsByContract').mockResolvedValue([]);
      jest.spyOn(assetContract, 'isOwnerOf').mockRejectedValue(new Error('rpc down'));

      const response = await request(app.getHttpServer())
        .get('/v1/offers?lender=0x80d16553493c2ff84b6f0f32b8561d39c7b3af22')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(response.status).toBe(200);
      expect(response.body[0].signature).toBeNull();
    });

    it('redacts signature when the ownership check rejects with a non-Error value', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(authPayload);
      jest.spyOn(offerRepository, 'countBy').mockResolvedValue(1);
      jest
        .spyOn(offerRepository, 'findSortPaginateBy')
        .mockResolvedValue([buildListOffer({ borrower: '0xffffffffffffffffffffffffffffffffffffffff' })]);
      jest
        .spyOn(assetsFacade, 'getAssets')
        .mockResolvedValue([buildAssetDto({ contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789', tokenId: '1' })]);
      jest.spyOn(assetsFacade, 'getCollectionsByContract').mockResolvedValue([]);
      jest.spyOn(assetContract, 'isOwnerOf').mockRejectedValue('string rejection');

      const response = await request(app.getHttpServer())
        .get('/v1/offers?lender=0x80d16553493c2ff84b6f0f32b8561d39c7b3af22')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(response.status).toBe(200);
      expect(response.body[0].signature).toBeNull();
    });

    it('returns empty response without calling ownership check when token account is missing', async () => {
      jest.spyOn(offerRepository, 'countBy').mockResolvedValue(1);
      jest
        .spyOn(offerRepository, 'findSortPaginateBy')
        .mockResolvedValue([buildListOffer({ borrower: '0xffffffffffffffffffffffffffffffffffffffff' })]);
      jest
        .spyOn(assetsFacade, 'getAssets')
        .mockResolvedValue([buildAssetDto({ contract: '0x145c5e0f3099dff40671d988c30b0e05f5279789', tokenId: '1' })]);
      jest.spyOn(assetsFacade, 'getCollectionsByContract').mockResolvedValue([]);
      const fnIsOwnerOf = jest.spyOn(assetContract, 'isOwnerOf');

      const response = await request(app.getHttpServer()).get(
        '/v1/offers?lender=0x80d16553493c2ff84b6f0f32b8561d39c7b3af22'
      );

      expect(response.status).toBe(200);
      expect(response.body[0].signature).toBeNull();
      expect(fnIsOwnerOf).not.toHaveBeenCalled();
    });

    it('passes every supported filter through to the repository', async () => {
      const fnCountBy = jest.spyOn(offerRepository, 'countBy').mockResolvedValue(0);
      const fnFind = jest.spyOn(offerRepository, 'findSortPaginateBy').mockResolvedValue([]);

      const query = [
        'lender=0x80d16553493c2ff84b6f0f32b8561d39c7b3af22',
        'borrower=0x268699101bb18d80576975584a222b5732cf56f2',
        'nftContract=0x145c5e0f3099dff40671d988c30b0e05f5279789',
        'lenderNe=0x1111111111111111111111111111111111111111',
        'borrowerNe=0x2222222222222222222222222222222222222222',
        'type=asset',
        'typeIn=asset,collection',
        'currency=0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
        'nftTokenId=1',
        'duration=86400',
        'durationNin=172800,259200',
        'collectionIds=10,20',
        'aprLte=50',
        'prorated=false',
        'nonce=n-42'
      ].join('&');

      const response = await request(app.getHttpServer()).get(`/v1/offers?${query}`);

      expect(response.status).toBe(200);
      expect(fnCountBy).toHaveBeenCalledWith(
        expect.objectContaining({
          lender: '0x80d16553493c2ff84b6f0f32b8561d39c7b3af22',
          borrower: '0x268699101bb18d80576975584a222b5732cf56f2',
          nftContract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
          lenderNe: '0x1111111111111111111111111111111111111111',
          borrowerNe: '0x2222222222222222222222222222222222222222',
          type: 'asset',
          typeIn: ['asset', 'collection'],
          currency: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
          nftTokenId: '1',
          duration: 86400,
          durationNin: [172800, 259200],
          collectionIds: [10, 20],
          aprLte: 50,
          prorated: false,
          lenderNonce: 'n-42'
        })
      );
      expect(fnFind).toHaveBeenCalledTimes(1);
    });

    it('applies sort and pagination from query', async () => {
      jest.spyOn(offerRepository, 'countBy').mockResolvedValue(42);
      const fnFind = jest.spyOn(offerRepository, 'findSortPaginateBy').mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get(
          '/v1/offers?lender=0x80d16553493c2ff84b6f0f32b8561d39c7b3af22&sort=principal&direction=asc&page=2&limit=25'
        )
        .expect(200);

      expect(fnFind).toHaveBeenCalledWith(expect.any(Object), {
        skip: 25,
        limit: 25,
        sort: { by: 'principal', direction: 'ASC' }
      });
      expect(response.headers['x-pagination-page']).toBe('2');
      expect(response.headers['x-pagination-limit']).toBe('25');
      expect(response.headers['x-pagination-total']).toBe('42');
      expect(response.body).toEqual([]);
    });

    it('returns 422 when no primary filter is provided', async () => {
      const response = await request(app.getHttpServer()).get('/v1/offers');
      expect(response.status).toBe(422);
      expect(offerNotificationService.notifyBorrowerReceivedOffer).not.toHaveBeenCalled();
    });

    it('accepts collectionIds as the sole primary filter', async () => {
      jest.spyOn(offerRepository, 'countBy').mockResolvedValue(0);
      const fnFind = jest.spyOn(offerRepository, 'findSortPaginateBy').mockResolvedValue([]);

      const response = await request(app.getHttpServer()).get('/v1/offers?collectionIds=10,20');

      expect(response.status).toBe(200);
      expect(fnFind).toHaveBeenCalledWith(expect.objectContaining({ collectionIds: [10, 20] }), expect.anything());
    });
  });

  describe(OfferV1Controller.prototype.handleDelete.name, () => {
    const existingOffer = {
      id: 42,
      lender: authPayload.account
    } as unknown as Offer;

    it('returns 401 when Authorization header is missing', async () => {
      const fnSoftDelete = jest.spyOn(offerRepository, 'softDelete');
      const response = await request(app.getHttpServer()).delete('/v1/offers/42');
      expect(response.status).toBe(401);
      expect(fnSoftDelete).not.toHaveBeenCalled();
    });

    it('returns 401 when JWT verification fails', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(new Error('invalid'));
      const fnSoftDelete = jest.spyOn(offerRepository, 'softDelete');

      const response = await request(app.getHttpServer())
        .delete('/v1/offers/42')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(response.status).toBe(401);
      expect(fnSoftDelete).not.toHaveBeenCalled();
    });

    it('returns 404 when offer does not exist', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(authPayload);
      jest.spyOn(offerRepository, 'findById').mockResolvedValue(null);
      const fnSoftDelete = jest.spyOn(offerRepository, 'softDelete');

      const response = await request(app.getHttpServer())
        .delete('/v1/offers/42')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(response.status).toBe(404);
      expect(response.body.errors).toEqual({ id: ['Offer 42 not found'] });
      expect(fnSoftDelete).not.toHaveBeenCalled();
    });

    it('returns 401 when caller is not the lender', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(authPayload);
      jest
        .spyOn(offerRepository, 'findById')
        .mockResolvedValue({ ...existingOffer, lender: '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' } as Offer);
      const fnSoftDelete = jest.spyOn(offerRepository, 'softDelete');

      const response = await request(app.getHttpServer())
        .delete('/v1/offers/42')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(response.status).toBe(401);
      expect(response.body.errors).toEqual({ lender: ['Offer lender must match the authenticated account'] });
      expect(fnSoftDelete).not.toHaveBeenCalled();
    });

    it('soft-deletes the offer and returns 204 when caller is the lender', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(authPayload);
      jest.spyOn(offerRepository, 'findById').mockResolvedValue(existingOffer);
      const fnSoftDelete = jest.spyOn(offerRepository, 'softDelete').mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .delete('/v1/offers/42')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});
      expect(fnSoftDelete).toHaveBeenCalledWith(42);
      expect(offersFacade.invalidateCache).toHaveBeenCalledTimes(1);
    });

    it('returns 400 when id is not a valid integer', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(authPayload);
      const fnFindById = jest.spyOn(offerRepository, 'findById');

      const response = await request(app.getHttpServer())
        .delete('/v1/offers/abc')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(response.status).toBe(400);
      expect(fnFindById).not.toHaveBeenCalled();
    });
  });
});
