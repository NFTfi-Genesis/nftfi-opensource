import { INestApplication } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ListingRepository, ListingPreference } from '@nftfi.api/repositories/postgres/listing';
import { AssetsFacade } from '@nftfi.api/facades/assets';
import { AssetContract } from '@nftfi.api/services/assets';
import { httpValidationPipe } from '@nftfi.api/validation';
import { ListingLegacyController } from '../src/listing-v1/listing-legacy.controller';
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
};

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

describe(ListingLegacyController.name, () => {
  let app: INestApplication;
  let listingRepository: ListingRepository;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [ListingLegacyController],
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

  describe('GET /listings', () => {
    const xFilters = JSON.stringify({ nftCollateralContract: [NFT_CONTRACT] });
    const xPaging = JSON.stringify({ limit: 20, skip: 0, sort: { listedDate: -1 } });

    it('returns listings in legacy flat format with X-Total header', async () => {
      const response = await request(app.getHttpServer())
        .get('/listings')
        .set('x-filters', xFilters)
        .set('x-paging', xPaging);

      expect(response.status).toBe(200);
      expect(response.headers['x-total']).toBe('1');
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toEqual(
        expect.objectContaining({
          nftCollateralContract: NFT_CONTRACT,
          nftCollateralId: NFT_TOKEN_ID,
          nftKey: `${NFT_TOKEN_ID}${NFT_CONTRACT}`,
          borrower: BORROWER,
          desiredLoanDuration: '7',
          desiredLoanCurrency: null,
          desiredIsProRata: null,
          desiredPreference: 'lowApr',
          listedDate: '2026-04-13T10:00:00.000Z',
          contractName: 'v2-3.loan.fixed',
          status: 'listed',
          whitelisted: true,
          isDeleted: false,
          name: 'Doodle #7332',
          projectName: 'Doodles',
          imageUrl: 'https://example.com/medium.png',
          nonce: null,
          listedBy: null,
          signedMessage: null,
          desiredLoanPrincipalAmount: null,
          desiredLoanCurrencyContract: null,
          desiredRepaymentAmount: null,
          minLoanDuration: null,
          maxLoanDuration: null,
          maximumRepaymentAmount: null,
          revenueSharePartner: null,
          loanInterestRateForDurationInBasisPoints: null,
          referralFeeInBasisPoints: null
        })
      );
    });

    it('passes nftCollateralContract filter as nftContracts to repository', async () => {
      const findFn = jest.spyOn(listingRepository, 'find').mockResolvedValue([]);
      jest.spyOn(listingRepository, 'count').mockResolvedValue(0);

      await request(app.getHttpServer())
        .get('/listings')
        .set('x-filters', JSON.stringify({ nftCollateralContract: [NFT_CONTRACT, '0xdef'] }))
        .set('x-paging', xPaging);

      expect(findFn).toHaveBeenCalledWith(
        expect.objectContaining({ nftContracts: [NFT_CONTRACT.toLowerCase(), '0xdef'] }),
        expect.any(Object)
      );
    });

    it('converts skip/limit to page-based pagination', async () => {
      const findFn = jest.spyOn(listingRepository, 'find').mockResolvedValue([]);
      jest.spyOn(listingRepository, 'count').mockResolvedValue(0);

      await request(app.getHttpServer())
        .get('/listings')
        .set('x-filters', '{}')
        .set('x-paging', JSON.stringify({ limit: 20, skip: 40 }));

      expect(findFn).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ skip: 40, limit: 20 }));
    });

    it('returns 422 when x-filters header is missing', async () => {
      const response = await request(app.getHttpServer()).get('/listings').set('x-paging', xPaging);

      expect(response.status).toBe(422);
    });

    it('returns 422 when x-paging header is missing', async () => {
      const response = await request(app.getHttpServer()).get('/listings').set('x-filters', xFilters);

      expect(response.status).toBe(422);
    });

    it('handles empty nftCollateralContract filter', async () => {
      const findFn = jest.spyOn(listingRepository, 'find').mockResolvedValue([]);
      jest.spyOn(listingRepository, 'count').mockResolvedValue(0);

      await request(app.getHttpServer())
        .get('/listings')
        .set('x-filters', JSON.stringify({ nftCollateralContract: [] }))
        .set('x-paging', xPaging);

      expect(findFn).toHaveBeenCalledWith(
        expect.not.objectContaining({ nftContracts: expect.anything() }),
        expect.any(Object)
      );
    });

    it('handles no filters', async () => {
      const findFn = jest.spyOn(listingRepository, 'find').mockResolvedValue([]);
      jest.spyOn(listingRepository, 'count').mockResolvedValue(0);

      await request(app.getHttpServer()).get('/listings').set('x-filters', '{}').set('x-paging', xPaging);

      expect(findFn).toHaveBeenCalledWith({}, expect.any(Object));
    });
  });
});
