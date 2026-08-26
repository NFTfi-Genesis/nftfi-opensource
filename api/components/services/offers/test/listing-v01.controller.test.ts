import { INestApplication } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Listing, ListingRepository, ListingPreference } from '@nftfi.api/repositories/postgres/listing';
import { AssetsFacade } from '@nftfi.api/facades/assets';
import { AssetContract } from '@nftfi.api/services/assets';
import { httpValidationPipe } from '@nftfi.api/validation';
import { ListingV01Controller } from '../src/listing-v1/listing-v01.controller';
import { ListingV1Service } from '../src/listing-v1/listing-v1.service';
import { ListingNotificationService } from '../src/listing-v1/listing-notification.service';

const NFT_CONTRACT = '0x8a90cab2b38dba80c64b7734e58ee1db38b8992e';
const NFT_TOKEN_ID = '7332';
const BORROWER = '0x5f79bd35435a7b98493543db0fec7f55292e9e77';

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

const mockAssetDto = {
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
    tokenStandard: 'erc721',
    name: 'Doodles',
    ranking: 1,
    imageUrl: 'https://example.com/doodles.png',
    whitelisted: true,
    openseaSlug: 'doodles-official'
  }
};

describe(ListingV01Controller.name, () => {
  let app: INestApplication;
  let listingRepository: ListingRepository;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [ListingV01Controller],
      providers: [
        ListingV1Service,
        {
          provide: ListingRepository,
          useValue: {
            find: jest.fn().mockResolvedValue([mockListing]),
            count: jest.fn().mockResolvedValue(1),
            findByAsset: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockListing),
            update: jest.fn().mockResolvedValue(mockListing),
            softDelete: jest.fn()
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
          useValue: { isOwnerOf: jest.fn().mockResolvedValue(true) }
        },
        {
          provide: ListingNotificationService,
          useValue: { notifyNewListing: jest.fn() }
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
    app.useGlobalPipes(httpValidationPipe);
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  describe('GET /v0.1/listings', () => {
    it('returns listings in SDK nested format wrapped in results', async () => {
      const response = await request(app.getHttpServer()).get('/v0.1/listings');

      expect(response.status).toBe(200);
      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          date: { listed: '2026-04-13T10:00:00.000Z' },
          nft: {
            id: NFT_TOKEN_ID,
            address: NFT_CONTRACT,
            name: 'Doodle #7332',
            project: { name: 'Doodles' }
          },
          borrower: { address: BORROWER },
          terms: {
            loan: {
              duration: 7,
              repayment: null,
              principal: null,
              currency: null,
              unit: null
            }
          },
          nftfi: { contract: { name: 'v2-3.loan.fixed' } }
        })
      );
    });

    it('generates base64 encoded id from contract/tokenId', async () => {
      const response = await request(app.getHttpServer()).get('/v0.1/listings');

      const id = decodeURIComponent(response.body.results[0].id);
      const decoded = Buffer.from(id, 'base64').toString();
      expect(decoded).toBe(`${NFT_CONTRACT}/${NFT_TOKEN_ID}`);
    });

    it('passes nftAddresses filter to repository as nftContracts', async () => {
      const findFn = jest.spyOn(listingRepository, 'find').mockResolvedValue([]);

      await request(app.getHttpServer()).get(`/v0.1/listings?nftAddresses=${NFT_CONTRACT}`);

      expect(findFn).toHaveBeenCalledWith(
        expect.objectContaining({ nftContracts: [NFT_CONTRACT.toLowerCase()] }),
        expect.any(Object)
      );
    });

    it('passes pagination params', async () => {
      const findFn = jest.spyOn(listingRepository, 'find').mockResolvedValue([]);

      await request(app.getHttpServer()).get('/v0.1/listings?page=2&limit=10');

      expect(findFn).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ skip: 10, limit: 10 }));
    });

    it('returns empty results when no listings', async () => {
      jest.spyOn(listingRepository, 'find').mockResolvedValue([]);

      const response = await request(app.getHttpServer()).get('/v0.1/listings');

      expect(response.status).toBe(200);
      expect(response.body.results).toEqual([]);
    });

    it('handles listings with no asset data', async () => {
      jest.spyOn(listingRepository, 'find').mockResolvedValue([mockListing]);
      const assetsFacade = app.get(AssetsFacade);
      jest.spyOn(assetsFacade, 'getAssets').mockResolvedValue([]);

      const response = await request(app.getHttpServer()).get('/v0.1/listings');

      expect(response.status).toBe(200);
      expect(response.body.results[0].nft.name).toBeNull();
      expect(response.body.results[0].nft.project.name).toBeNull();
    });
  });
});
