import { INestApplication } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { HttpResponseHeader } from '@nftfi.api/core/dtos';
import { AssetsFacade } from '@nftfi.api/facades/assets';
import { ContractRepository } from '@nftfi.api/modules/ethers-observer';
import { buildPostgresMarketLoan } from '@nftfi.api/repositories/postgres/factories/market-loan';
import {
  MarketLoanProtocol,
  MarketLoanRepository,
  MarketLoanStatus
} from '@nftfi.api/repositories/postgres/market-loan';
import { buildAssetDto, buildCollectionDto } from '@nftfi.api/services/assets/factories';
import { httpValidationPipe } from '@nftfi.api/validation/api-validation.pipe';
import { LoanV1Controller, LoanV1Service } from '../src/loan-v1';
import { LoansCacheScope } from '../src/loan-v1/loan-v1.types';

describe(LoanV1Controller.name, () => {
  let app: INestApplication;
  let controller: LoanV1Controller;
  let loanRepository: MarketLoanRepository;
  let contractRepository: ContractRepository;
  let assetsFacade: AssetsFacade;
  let cacheClient: { keys: jest.Mock; del: jest.Mock };

  beforeEach(async () => {
    jest.resetAllMocks();

    cacheClient = { keys: jest.fn(), del: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [LoanV1Controller],
      providers: [
        LoanV1Service,
        {
          provide: MarketLoanRepository,
          useValue: {
            find: jest.fn(),
            count: jest.fn()
          }
        },
        {
          provide: ContractRepository,
          useValue: {
            findByAddress: jest.fn()
          }
        },
        {
          provide: AssetsFacade,
          useValue: {
            getAssets: jest.fn()
          }
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            store: {
              client: cacheClient
            }
          }
        }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    controller = moduleRef.get(LoanV1Controller);
    loanRepository = moduleRef.get(MarketLoanRepository);
    contractRepository = moduleRef.get(ContractRepository);
    assetsFacade = moduleRef.get(AssetsFacade);

    app.useGlobalPipes(httpValidationPipe);

    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  describe(LoanV1Controller.prototype.handleGet.name, () => {
    it('returns loans with pagination headers', async () => {
      const loan = buildPostgresMarketLoan({
        id: 67,
        loanId: '67',
        contract: '0xdb65702a9b26f8a643a31a4c84b9392589e03d7c',
        protocol: MarketLoanProtocol.Nftfi,
        status: MarketLoanStatus.Active,
        borrower: '0x8a32121d737ce9c7b7b6e17cc7f10d7c2d5f8adc',
        lender: '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d',
        currency: '0x6b175474e89094c44da98b954eedeac495271d0f',
        principal: '1000000000000000000',
        repayment: '1100000000000000000',
        interest: '100000000000000000',
        originationFee: '1000000000000000',
        adminFee: '2000000000000000',
        apr: 12.5,
        eapr: 13.1,
        duration: 7776000,
        startedAt: new Date('2024-01-01T00:00:00.000Z'),
        dueAt: new Date('2024-02-01T00:00:00.000Z'),
        endedAt: null,
        prorated: false,
        nftContract: '0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b',
        nftTokenId: '810187'
      });
      const assetDto = buildAssetDto({
        contract: '0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b',
        tokenId: '810187',
        name: 'MultiFaucet Test NFT',
        imageSmallUrl: 'https://example.com/small.png',
        imageMediumUrl: 'https://example.com/medium.png',
        collection: buildCollectionDto({ name: 'MultiFaucet NFT' })
      });

      const fnFind = jest.spyOn(loanRepository, 'find').mockResolvedValue([loan]);
      const fnCount = jest.spyOn(loanRepository, 'count').mockResolvedValue(1);
      const fnFindByAddress = jest
        .spyOn(contractRepository, 'findByAddress')
        .mockReturnValue({ constructor: { name: 'MockLoanContract' } } as unknown as object);
      const fnGetAssets = jest.spyOn(assetsFacade, 'getAssets').mockResolvedValue([assetDto]);

      const response = await request(app.getHttpServer()).get(
        '/v1/loans?statuses=active,repaid&wallets=0x40B59781Fc653ce093CC74c206Bc3Fcb09252e3E,0x053DD3E4D764F487F16E7BF2247B14EB4C1C667D&dueAtBefore=2024-02-15T00:00:00.000Z&page=2&limit=5'
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          id: 67,
          loanId: '67',
          contract: '0xdb65702a9b26f8a643a31a4c84b9392589e03d7c',
          contractName: 'MockLoanContract',
          protocol: 'nftfi',
          status: 'active',
          borrower: '0x8a32121d737ce9c7b7b6e17cc7f10d7c2d5f8adc',
          lender: '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d',
          currency: '0x6b175474e89094c44da98b954eedeac495271d0f',
          principal: '1000000000000000000',
          repayment: '1100000000000000000',
          repaymentMax: '120',
          interest: '100000000000000000',
          originationFee: '1000000000000000',
          adminFee: '2000000000000000',
          apr: 12.5,
          eapr: 13.1,
          duration: 7776000,
          prorated: false,
          startedAt: '2024-01-01T00:00:00.000Z',
          dueAt: '2024-02-01T00:00:00.000Z',
          endedAt: null,
          asset: {
            id: 1,
            contract: '0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b',
            owners: ['0x000000000000000000000000000000000000000000'],
            tokenId: '810187',
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
          }
        }
      ]);
      expect(response.headers[HttpResponseHeader.PaginationPage.toLowerCase()]).toBe('2');
      expect(response.headers[HttpResponseHeader.PaginationLimit.toLowerCase()]).toBe('5');
      expect(response.headers[HttpResponseHeader.PaginationTotal.toLowerCase()]).toBe('1');

      expect(fnFind).toHaveBeenCalledTimes(1);
      expect(fnFind).toHaveBeenCalledWith(
        {
          statuses: [MarketLoanStatus.Active, MarketLoanStatus.Repaid],
          borrower: undefined,
          lender: undefined,
          wallets: ['0x40b59781fc653ce093cc74c206bc3fcb09252e3e', '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d'],
          dueAtBefore: new Date('2024-02-15T00:00:00.000Z'),
          currencies: undefined,
          collectionIds: undefined,
          protocols: undefined,
          nftIds: undefined
        },
        { skip: 5, limit: 5 }
      );
      expect(fnCount).toHaveBeenCalledWith({
        statuses: [MarketLoanStatus.Active, MarketLoanStatus.Repaid],
        borrower: undefined,
        lender: undefined,
        wallets: ['0x40b59781fc653ce093cc74c206bc3fcb09252e3e', '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d'],
        dueAtBefore: new Date('2024-02-15T00:00:00.000Z'),
        currencies: undefined,
        collectionIds: undefined,
        protocols: undefined,
        nftIds: undefined
      });
      expect(fnFindByAddress).toHaveBeenCalledWith('0xdb65702a9b26f8a643a31a4c84b9392589e03d7c');
      expect(fnGetAssets).toHaveBeenCalledWith({
        keys: [{ contract: '0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b', tokenId: '810187' }]
      });
    });

    it('uses default pagination when not provided', async () => {
      const fnFind = jest.spyOn(loanRepository, 'find').mockResolvedValue([]);
      const fnCount = jest.spyOn(loanRepository, 'count').mockResolvedValue(0);
      const fnGetAssets = jest.spyOn(assetsFacade, 'getAssets').mockResolvedValue([]);

      const response = await request(app.getHttpServer()).get('/v1/loans');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
      expect(response.headers[HttpResponseHeader.PaginationPage.toLowerCase()]).toBe('1');
      expect(response.headers[HttpResponseHeader.PaginationLimit.toLowerCase()]).toBe('100');
      expect(response.headers[HttpResponseHeader.PaginationTotal.toLowerCase()]).toBe('0');

      expect(fnFind).toHaveBeenCalledWith(
        {
          statuses: undefined,
          borrower: undefined,
          lender: undefined,
          wallets: undefined,
          dueAtBefore: undefined,
          currencies: undefined,
          collectionIds: undefined,
          protocols: undefined,
          nftIds: undefined
        },
        { skip: 0, limit: 100 }
      );
      expect(fnCount).toHaveBeenCalledWith({
        statuses: undefined,
        borrower: undefined,
        lender: undefined,
        wallets: undefined,
        dueAtBefore: undefined,
        currencies: undefined,
        collectionIds: undefined,
        protocols: undefined,
        nftIds: undefined
      });
      expect(fnGetAssets).not.toHaveBeenCalled();
    });

    it('passes borrower filter to repository', async () => {
      const fnFind = jest.spyOn(loanRepository, 'find').mockResolvedValue([]);
      const fnCount = jest.spyOn(loanRepository, 'count').mockResolvedValue(0);
      const fnGetAssets = jest.spyOn(assetsFacade, 'getAssets').mockResolvedValue([]);

      const response = await request(app.getHttpServer()).get(
        '/v1/loans?borrower=0x8A32121D737CE9C7B7B6E17CC7F10D7C2D5F8ADC&page=1&limit=10'
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);

      expect(fnFind).toHaveBeenCalledWith(
        {
          statuses: undefined,
          borrower: '0x8a32121d737ce9c7b7b6e17cc7f10d7c2d5f8adc',
          lender: undefined,
          wallets: undefined,
          dueAtBefore: undefined,
          currencies: undefined,
          collectionIds: undefined,
          protocols: undefined,
          nftIds: undefined
        },
        { skip: 0, limit: 10 }
      );
      expect(fnCount).toHaveBeenCalledWith({
        statuses: undefined,
        borrower: '0x8a32121d737ce9c7b7b6e17cc7f10d7c2d5f8adc',
        lender: undefined,
        wallets: undefined,
        dueAtBefore: undefined,
        currencies: undefined,
        collectionIds: undefined,
        protocols: undefined,
        nftIds: undefined
      });
      expect(fnGetAssets).not.toHaveBeenCalled();
    });

    it('passes lender filter to repository', async () => {
      const fnFind = jest.spyOn(loanRepository, 'find').mockResolvedValue([]);
      const fnCount = jest.spyOn(loanRepository, 'count').mockResolvedValue(0);
      const fnGetAssets = jest.spyOn(assetsFacade, 'getAssets').mockResolvedValue([]);

      const response = await request(app.getHttpServer()).get(
        '/v1/loans?lender=0x053DD3E4D764F487F16E7BF2247B14EB4C1C667D&page=1&limit=10'
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);

      expect(fnFind).toHaveBeenCalledWith(
        {
          statuses: undefined,
          borrower: undefined,
          lender: '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d',
          wallets: undefined,
          dueAtBefore: undefined,
          currencies: undefined,
          collectionIds: undefined,
          protocols: undefined,
          nftIds: undefined
        },
        { skip: 0, limit: 10 }
      );
      expect(fnCount).toHaveBeenCalledWith({
        statuses: undefined,
        borrower: undefined,
        lender: '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d',
        wallets: undefined,
        dueAtBefore: undefined,
        currencies: undefined,
        collectionIds: undefined,
        protocols: undefined,
        nftIds: undefined
      });
      expect(fnGetAssets).not.toHaveBeenCalled();
    });

    it('passes collectionName sort to repository', async () => {
      const fnFind = jest.spyOn(loanRepository, 'find').mockResolvedValue([]);
      const fnCount = jest.spyOn(loanRepository, 'count').mockResolvedValue(0);
      const fnGetAssets = jest.spyOn(assetsFacade, 'getAssets').mockResolvedValue([]);

      const response = await request(app.getHttpServer()).get('/v1/loans?sortBy=collectionName&sortDirection=asc');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);

      expect(fnFind).toHaveBeenCalledWith(
        {
          statuses: undefined,
          borrower: undefined,
          lender: undefined,
          wallets: undefined,
          dueAtBefore: undefined,
          currencies: undefined,
          collectionIds: undefined,
          protocols: undefined,
          nftIds: undefined
        },
        {
          skip: 0,
          limit: 100,
          sort: { by: 'collectionName', direction: 'ASC' }
        }
      );
      expect(fnCount).toHaveBeenCalledWith({
        statuses: undefined,
        borrower: undefined,
        lender: undefined,
        wallets: undefined,
        dueAtBefore: undefined,
        currencies: undefined,
        collectionIds: undefined,
        protocols: undefined,
        nftIds: undefined
      });
      expect(fnGetAssets).not.toHaveBeenCalled();
    });

    it('passes repaymentMax sort to repository', async () => {
      const fnFind = jest.spyOn(loanRepository, 'find').mockResolvedValue([]);
      const fnCount = jest.spyOn(loanRepository, 'count').mockResolvedValue(0);
      const fnGetAssets = jest.spyOn(assetsFacade, 'getAssets').mockResolvedValue([]);

      const response = await request(app.getHttpServer()).get('/v1/loans?sortBy=repaymentMax&sortDirection=desc');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);

      expect(fnFind).toHaveBeenCalledWith(
        {
          statuses: undefined,
          borrower: undefined,
          lender: undefined,
          wallets: undefined,
          dueAtBefore: undefined,
          currencies: undefined,
          collectionIds: undefined,
          protocols: undefined,
          nftIds: undefined
        },
        {
          skip: 0,
          limit: 100,
          sort: { by: 'repaymentMax', direction: 'DESC' }
        }
      );
      expect(fnCount).toHaveBeenCalledWith({
        statuses: undefined,
        borrower: undefined,
        lender: undefined,
        wallets: undefined,
        dueAtBefore: undefined,
        currencies: undefined,
        collectionIds: undefined,
        protocols: undefined,
        nftIds: undefined
      });
      expect(fnGetAssets).not.toHaveBeenCalled();
    });

    it('passes protocols, currencies, collectionIds and collectionName sort to repository', async () => {
      const fnFind = jest.spyOn(loanRepository, 'find').mockResolvedValue([]);
      const fnCount = jest.spyOn(loanRepository, 'count').mockResolvedValue(0);
      const fnGetAssets = jest.spyOn(assetsFacade, 'getAssets').mockResolvedValue([]);

      const response = await request(app.getHttpServer()).get(
        '/v1/loans?protocols=nftfi,arcade&currencies=0x6B175474E89094C44DA98B954EEDEAC495271D0F,0xA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48&collectionIds=10,20&sortBy=collectionName&sortDirection=asc&page=3&limit=7'
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);

      expect(fnFind).toHaveBeenCalledWith(
        {
          statuses: undefined,
          borrower: undefined,
          lender: undefined,
          wallets: undefined,
          dueAtBefore: undefined,
          protocols: [MarketLoanProtocol.Nftfi, MarketLoanProtocol.Arcade],
          currencies: ['0x6b175474e89094c44da98b954eedeac495271d0f', '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'],
          collectionIds: [10, 20],
          nftIds: undefined
        },
        {
          skip: 14,
          limit: 7,
          sort: { by: 'collectionName', direction: 'ASC' }
        }
      );
      expect(fnCount).toHaveBeenCalledWith({
        statuses: undefined,
        borrower: undefined,
        lender: undefined,
        wallets: undefined,
        dueAtBefore: undefined,
        currencies: ['0x6b175474e89094c44da98b954eedeac495271d0f', '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'],
        collectionIds: [10, 20],
        protocols: [MarketLoanProtocol.Nftfi, MarketLoanProtocol.Arcade],
        nftIds: undefined
      });
      expect(fnGetAssets).not.toHaveBeenCalled();
    });

    it('wraps singular wallet into the wallets array', async () => {
      const fnFind = jest.spyOn(loanRepository, 'find').mockResolvedValue([]);
      jest.spyOn(loanRepository, 'count').mockResolvedValue(0);
      jest.spyOn(assetsFacade, 'getAssets').mockResolvedValue([]);

      const response = await request(app.getHttpServer()).get(
        '/v1/loans?wallet=0x40B59781Fc653ce093CC74c206Bc3Fcb09252e3E'
      );

      expect(response.status).toBe(200);
      expect(fnFind).toHaveBeenCalledWith(
        expect.objectContaining({ wallets: ['0x40b59781fc653ce093cc74c206bc3fcb09252e3e'] }),
        { skip: 0, limit: 100 }
      );
    });

    it('merges singular wallet with plural wallets and deduplicates', async () => {
      const fnFind = jest.spyOn(loanRepository, 'find').mockResolvedValue([]);
      jest.spyOn(loanRepository, 'count').mockResolvedValue(0);
      jest.spyOn(assetsFacade, 'getAssets').mockResolvedValue([]);

      const response = await request(app.getHttpServer()).get(
        '/v1/loans?wallet=0x40B59781Fc653ce093CC74c206Bc3Fcb09252e3E&wallets=0x40B59781Fc653ce093CC74c206Bc3Fcb09252e3E,0x053DD3E4D764F487F16E7BF2247B14EB4C1C667D'
      );

      expect(response.status).toBe(200);
      expect(fnFind).toHaveBeenCalledWith(
        expect.objectContaining({
          wallets: ['0x40b59781fc653ce093cc74c206bc3fcb09252e3e', '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d']
        }),
        { skip: 0, limit: 100 }
      );
    });

    it('wraps singular status into the statuses array', async () => {
      const fnFind = jest.spyOn(loanRepository, 'find').mockResolvedValue([]);
      jest.spyOn(loanRepository, 'count').mockResolvedValue(0);
      jest.spyOn(assetsFacade, 'getAssets').mockResolvedValue([]);

      const response = await request(app.getHttpServer()).get('/v1/loans?status=active');

      expect(response.status).toBe(200);
      expect(fnFind).toHaveBeenCalledWith(expect.objectContaining({ statuses: [MarketLoanStatus.Active] }), {
        skip: 0,
        limit: 100
      });
    });

    it('merges singular status with plural statuses and deduplicates', async () => {
      const fnFind = jest.spyOn(loanRepository, 'find').mockResolvedValue([]);
      jest.spyOn(loanRepository, 'count').mockResolvedValue(0);
      jest.spyOn(assetsFacade, 'getAssets').mockResolvedValue([]);

      const response = await request(app.getHttpServer()).get('/v1/loans?status=active&statuses=active,repaid');

      expect(response.status).toBe(200);
      expect(fnFind).toHaveBeenCalledWith(
        expect.objectContaining({ statuses: [MarketLoanStatus.Active, MarketLoanStatus.Repaid] }),
        { skip: 0, limit: 100 }
      );
    });

    it('passes nftIds filter to repository', async () => {
      const fnFind = jest.spyOn(loanRepository, 'find').mockResolvedValue([]);
      const fnCount = jest.spyOn(loanRepository, 'count').mockResolvedValue(0);
      const fnGetAssets = jest.spyOn(assetsFacade, 'getAssets').mockResolvedValue([]);

      const response = await request(app.getHttpServer()).get('/v1/loans?nftIds=123,456,789');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);

      expect(fnFind).toHaveBeenCalledWith(
        {
          statuses: undefined,
          borrower: undefined,
          lender: undefined,
          wallets: undefined,
          dueAtBefore: undefined,
          currencies: undefined,
          collectionIds: undefined,
          protocols: undefined,
          nftIds: ['123', '456', '789']
        },
        { skip: 0, limit: 100 }
      );
      expect(fnCount).toHaveBeenCalledWith({
        statuses: undefined,
        borrower: undefined,
        lender: undefined,
        wallets: undefined,
        dueAtBefore: undefined,
        currencies: undefined,
        collectionIds: undefined,
        protocols: undefined,
        nftIds: ['123', '456', '789']
      });
      expect(fnGetAssets).not.toHaveBeenCalled();
    });

    it('coerces undefined endedAt to null and falls back to Unknown contract name', async () => {
      const loan = buildPostgresMarketLoan({
        id: 99,
        loanId: '99',
        contract: '0xunknowncontract',
        nftContract: '0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b',
        nftTokenId: '42',
        endedAt: undefined
      });
      const assetDto = buildAssetDto({
        contract: '0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b',
        tokenId: '42',
        collection: buildCollectionDto()
      });

      jest.spyOn(loanRepository, 'find').mockResolvedValue([loan]);
      jest.spyOn(loanRepository, 'count').mockResolvedValue(1);
      jest.spyOn(contractRepository, 'findByAddress').mockReturnValue(undefined);
      jest.spyOn(assetsFacade, 'getAssets').mockResolvedValue([assetDto]);

      const response = await request(app.getHttpServer()).get('/v1/loans');

      expect(response.status).toBe(200);
      expect(response.body[0].contractName).toBe('Unknown');
      expect(response.body[0].endedAt).toBeNull();
    });

    it('preserves an existing endedAt date', async () => {
      const loan = buildPostgresMarketLoan({
        nftContract: '0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b',
        nftTokenId: '42',
        endedAt: new Date('2024-05-01T00:00:00.000Z')
      });
      const assetDto = buildAssetDto({
        contract: '0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b',
        tokenId: '42',
        collection: buildCollectionDto()
      });

      jest.spyOn(loanRepository, 'find').mockResolvedValue([loan]);
      jest.spyOn(loanRepository, 'count').mockResolvedValue(1);
      jest
        .spyOn(contractRepository, 'findByAddress')
        .mockReturnValue({ constructor: { name: 'MockLoanContract' } } as unknown as object);
      jest.spyOn(assetsFacade, 'getAssets').mockResolvedValue([assetDto]);

      const response = await request(app.getHttpServer()).get('/v1/loans');

      expect(response.status).toBe(200);
      expect(response.body[0].endedAt).toBe('2024-05-01T00:00:00.000Z');
    });
  });

  describe(LoanV1Controller.prototype.handleInvalidateCacheMessage.name, () => {
    it('returns empty rpc response payload and skips deletion when no cache keys exist', async () => {
      cacheClient.keys.mockResolvedValue([]);

      const result = await controller.handleInvalidateCacheMessage();

      expect(result).toEqual({ data: undefined });
      expect(cacheClient.keys).toHaveBeenCalledWith(`${LoansCacheScope}:*`);
      expect(cacheClient.del).not.toHaveBeenCalled();
    });

    it('deletes cache keys in batches of 100', async () => {
      const keys = Array.from({ length: 205 }, (_, index) => `${LoansCacheScope}:k-${index}`);
      cacheClient.keys.mockResolvedValue(keys);
      cacheClient.del.mockResolvedValue(undefined);

      const result = await controller.handleInvalidateCacheMessage();

      expect(result).toEqual({ data: undefined });
      expect(cacheClient.del).toHaveBeenCalledTimes(3);
      expect(cacheClient.del).toHaveBeenNthCalledWith(1, ...keys.slice(0, 100));
      expect(cacheClient.del).toHaveBeenNthCalledWith(2, ...keys.slice(100, 200));
      expect(cacheClient.del).toHaveBeenNthCalledWith(3, ...keys.slice(200, 205));
    });
  });
});
