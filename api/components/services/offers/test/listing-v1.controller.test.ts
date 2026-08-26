import { INestApplication } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { Listing, ListingRepository, ListingPreference } from '@nftfi.api/repositories/postgres/listing';
import { TokenStandard } from '@nftfi.api/repositories/postgres/collection';
import { AssetDto, AssetsFacade } from '@nftfi.api/facades/assets';
import { AssetContract } from '@nftfi.api/services/assets';
import { httpValidationPipe } from '@nftfi.api/validation';
import { AuthService, AuthModuleConfigToken } from '@nftfi.api/modules/auth-guard';
import { ListingV1Controller } from '../src/listing-v1/listing-v1.controller';
import { ListingV1Service } from '../src/listing-v1/listing-v1.service';
import { ListingNotificationService } from '../src/listing-v1/listing-notification.service';
import { ListingPipe } from '../src/listing-v1/listing.pipe';

const BORROWER = '0x5f79bd35435a7b98493543db0fec7f55292e9e77';
const OTHER_WALLET = '0x1111111111111111111111111111111111111111';
const NFT_CONTRACT = '0x8a90cab2b38dba80c64b7734e58ee1db38b8992e';
const NFT_TOKEN_ID = '7332';

const mockListing = {
  id: 1,
  nftContract: NFT_CONTRACT,
  nftTokenId: NFT_TOKEN_ID,
  borrower: BORROWER,
  currency: null,
  duration: 604800,
  prorated: null,
  preference: ListingPreference.LowApr,
  createdAt: new Date('2026-04-13T10:00:00Z'),
  updatedAt: new Date('2026-04-13T10:00:00Z'),
  deletedAt: null,
  deletedReason: null,
  asset: { id: 1 }
} as Listing;

const mockAssetDto: AssetDto = {
  id: 1,
  contract: NFT_CONTRACT,
  tokenId: NFT_TOKEN_ID,
  name: 'Doodle #7332',
  imageSmallUrl: 'https://example.com/small.png',
  imageMediumUrl: 'https://example.com/medium.png',
  owners: [BORROWER],
  collection: {
    id: 1,
    contract: NFT_CONTRACT,
    tokenRange: '0:9999',
    tokenSupply: '10000',
    tokenStandard: TokenStandard.ERC721,
    name: 'Doodles',
    ranking: 1,
    imageUrl: 'https://example.com/doodles.png',
    whitelisted: true,
    openseaSlug: 'doodles-official',
    floor: null,
    stats: null
  }
};

describe(ListingV1Controller.name, () => {
  let app: INestApplication;
  let listingRepository: ListingRepository;
  let assetsFacade: AssetsFacade;
  let assetContractService: AssetContract;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [ListingV1Controller],
      providers: [
        ListingV1Service,
        ListingPipe,
        AuthService,
        {
          provide: ListingRepository,
          useValue: {
            find: jest.fn().mockResolvedValue([]),
            count: jest.fn().mockResolvedValue(0),
            findByAsset: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockListing),
            update: jest.fn().mockResolvedValue(mockListing),
            softDelete: jest.fn().mockResolvedValue(undefined)
          }
        },
        {
          provide: AssetsFacade,
          useValue: {
            getAssets: jest.fn().mockResolvedValue([mockAssetDto]),
            getAssetByKey: jest.fn().mockResolvedValue(mockAssetDto)
          }
        },
        {
          provide: AssetContract,
          useValue: {
            isOwnerOf: jest.fn().mockResolvedValue(true)
          }
        },
        {
          provide: ListingNotificationService,
          useValue: {
            notifyNewListing: jest.fn()
          }
        },
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn()
          }
        },
        {
          provide: AuthModuleConfigToken,
          useValue: { secret: 'test-secret' }
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            store: { client: { keys: jest.fn().mockResolvedValue([]), del: jest.fn() } }
          }
        }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    listingRepository = moduleRef.get(ListingRepository);
    assetsFacade = moduleRef.get(AssetsFacade);
    assetContractService = moduleRef.get(AssetContract);

    app.useGlobalPipes(httpValidationPipe);
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  const authHeader = (account: string = BORROWER): string =>
    `Bearer ${Buffer.from('header').toString('base64')}.${Buffer.from(JSON.stringify({ account })).toString(
      'base64'
    )}.signature`;

  describe('GET /v1/listings', () => {
    it('returns empty array with pagination headers', async () => {
      const response = await request(app.getHttpServer()).get('/v1/listings');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
      expect(response.headers['x-pagination-page']).toBe('1');
      expect(response.headers['x-pagination-limit']).toBe('100');
      expect(response.headers['x-pagination-total']).toBe('0');
    });

    it('returns listings with asset data enriched', async () => {
      jest.spyOn(listingRepository, 'find').mockResolvedValue([mockListing]);
      jest.spyOn(listingRepository, 'count').mockResolvedValue(1);

      const response = await request(app.getHttpServer()).get('/v1/listings');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].borrower).toBe(BORROWER);
      expect(response.body[0].asset.name).toBe('Doodle #7332');
      expect(response.headers['x-pagination-total']).toBe('1');
    });

    it('passes filters to repository', async () => {
      const fn = jest.spyOn(listingRepository, 'find').mockResolvedValue([]);

      await request(app.getHttpServer()).get(`/v1/listings?borrower=${BORROWER}&duration=604800&collectionIds=1,2`);

      expect(fn).toHaveBeenCalledWith(
        expect.objectContaining({
          borrower: BORROWER,
          duration: 604800,
          collectionIds: [1, 2]
        }),
        expect.any(Object)
      );
    });

    it('passes pagination params', async () => {
      const fn = jest.spyOn(listingRepository, 'find').mockResolvedValue([]);

      const response = await request(app.getHttpServer()).get('/v1/listings?page=2&limit=50');

      expect(response.status).toBe(200);
      expect(fn).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ skip: 50, limit: 50 }));
    });

    it('rejects invalid sortBy', async () => {
      const response = await request(app.getHttpServer()).get('/v1/listings?sortBy=invalid');

      expect(response.status).toBe(422);
    });

    it('rejects limit exceeding max', async () => {
      const response = await request(app.getHttpServer()).get('/v1/listings?limit=201');

      expect(response.status).toBe(422);
    });
  });

  describe('POST /v1/listings', () => {
    const validBody = {
      nftContract: NFT_CONTRACT,
      nftTokenId: NFT_TOKEN_ID,
      borrower: BORROWER,
      duration: 604800,
      currency: null,
      prorated: null,
      preference: 'lowApr'
    };

    it('creates a listing and returns 201', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/listings')
        .set('Authorization', authHeader())
        .send(validBody);

      expect(response.status).toBe(201);
      expect(response.body.borrower).toBe(BORROWER);
    });

    it('returns 401 without auth token', async () => {
      const response = await request(app.getHttpServer()).post('/v1/listings').send(validBody);

      expect(response.status).toBe(401);
    });

    it('returns 403 when borrower does not match auth token', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/listings')
        .set('Authorization', authHeader(OTHER_WALLET))
        .send(validBody);

      expect(response.status).toBe(403);
    });

    it('returns 409 when listing already exists', async () => {
      jest.spyOn(listingRepository, 'findByAsset').mockResolvedValue(mockListing);

      const response = await request(app.getHttpServer())
        .post('/v1/listings')
        .set('Authorization', authHeader())
        .send(validBody);

      expect(response.status).toBe(409);
    });

    it('returns 500 when create hits unique constraint after findByAsset (concurrent race)', async () => {
      const err = new Error('duplicate key value violates unique constraint') as NodeJS.ErrnoException;
      err.code = '23505';
      jest.spyOn(listingRepository, 'create').mockRejectedValue(err);

      const response = await request(app.getHttpServer())
        .post('/v1/listings')
        .set('Authorization', authHeader())
        .send(validBody);

      expect(response.status).toBe(500);
    });

    it('returns 404 when asset not found on-chain', async () => {
      jest.spyOn(assetsFacade, 'getAssetByKey').mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/v1/listings')
        .set('Authorization', authHeader())
        .send(validBody);

      expect(response.status).toBe(404);
    });

    it('returns 500 when assets service has a transient error', async () => {
      jest.spyOn(assetsFacade, 'getAssetByKey').mockRejectedValue(new Error('ECONNREFUSED'));

      const response = await request(app.getHttpServer())
        .post('/v1/listings')
        .set('Authorization', authHeader())
        .send(validBody);

      expect(response.status).toBe(500);
    });

    it('returns 403 when collection is not whitelisted', async () => {
      jest.spyOn(assetsFacade, 'getAssetByKey').mockResolvedValue({
        ...mockAssetDto,
        collection: { ...mockAssetDto.collection, whitelisted: false }
      });

      const response = await request(app.getHttpServer())
        .post('/v1/listings')
        .set('Authorization', authHeader())
        .send(validBody);

      expect(response.status).toBe(403);
    });

    it('returns 403 when borrower does not own ERC721 asset', async () => {
      jest.spyOn(assetContractService, 'isOwnerOf').mockResolvedValue(false);

      const response = await request(app.getHttpServer())
        .post('/v1/listings')
        .set('Authorization', authHeader())
        .send(validBody);

      expect(response.status).toBe(403);
    });

    it('returns 403 for non-ERC721 assets', async () => {
      jest.spyOn(assetsFacade, 'getAssetByKey').mockResolvedValue({
        ...mockAssetDto,
        collection: { ...mockAssetDto.collection, tokenStandard: TokenStandard.ERC1155 }
      });

      const response = await request(app.getHttpServer())
        .post('/v1/listings')
        .set('Authorization', authHeader())
        .send(validBody);

      expect(response.status).toBe(403);
      expect(assetContractService.isOwnerOf).not.toHaveBeenCalled();
    });

    it('returns 422 for invalid body', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/listings')
        .set('Authorization', authHeader())
        .send({ nftContract: 'not-an-address' });

      expect(response.status).toBe(422);
    });
  });

  describe('PUT /v1/listings/:nftContract/:nftTokenId', () => {
    const updateBody = {
      duration: 1209600,
      currency: null,
      prorated: true,
      preference: 'highAmount'
    };

    beforeEach(() => {
      jest.spyOn(listingRepository, 'findByAsset').mockResolvedValue(mockListing);
    });

    it('updates and returns 200', async () => {
      const response = await request(app.getHttpServer())
        .put(`/v1/listings/${NFT_CONTRACT}/${NFT_TOKEN_ID}`)
        .set('Authorization', authHeader())
        .send(updateBody);

      expect(response.status).toBe(200);
    });

    it('returns 404 when listing not found', async () => {
      jest.spyOn(listingRepository, 'findByAsset').mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .put(`/v1/listings/${NFT_CONTRACT}/${NFT_TOKEN_ID}`)
        .set('Authorization', authHeader())
        .send(updateBody);

      expect(response.status).toBe(404);
    });

    it('returns 403 when user is not the borrower', async () => {
      const response = await request(app.getHttpServer())
        .put(`/v1/listings/${NFT_CONTRACT}/${NFT_TOKEN_ID}`)
        .set('Authorization', authHeader(OTHER_WALLET))
        .send(updateBody);

      expect(response.status).toBe(403);
    });

    it('returns 401 without auth token', async () => {
      const response = await request(app.getHttpServer())
        .put(`/v1/listings/${NFT_CONTRACT}/${NFT_TOKEN_ID}`)
        .send(updateBody);

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /v1/listings/:nftContract/:nftTokenId', () => {
    beforeEach(() => {
      jest.spyOn(listingRepository, 'findByAsset').mockResolvedValue(mockListing);
    });

    it('soft-deletes and returns 200', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/v1/listings/${NFT_CONTRACT}/${NFT_TOKEN_ID}`)
        .set('Authorization', authHeader());

      expect(response.status).toBe(200);
      expect(listingRepository.softDelete).toHaveBeenCalledWith(1, 'USER_ACTION');
    });

    it('returns 404 when listing not found', async () => {
      jest.spyOn(listingRepository, 'findByAsset').mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .delete(`/v1/listings/${NFT_CONTRACT}/${NFT_TOKEN_ID}`)
        .set('Authorization', authHeader());

      expect(response.status).toBe(404);
    });

    it('returns 403 when user is not the borrower', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/v1/listings/${NFT_CONTRACT}/${NFT_TOKEN_ID}`)
        .set('Authorization', authHeader(OTHER_WALLET));

      expect(response.status).toBe(403);
    });

    it('returns 401 without auth token', async () => {
      const response = await request(app.getHttpServer()).delete(`/v1/listings/${NFT_CONTRACT}/${NFT_TOKEN_ID}`);

      expect(response.status).toBe(401);
    });
  });
});
