import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { SupportedCurrencies } from '@nftfi.api/core';
import { AssetsFacade } from '@nftfi.api/facades/assets';
import { buildAssetDto, buildCollectionDto } from '@nftfi.api/services/assets/factories';
import {
  MarketLoan,
  MarketLoanProtocol,
  MarketLoanRepository,
  MarketLoanStatus
} from '@nftfi.api/repositories/postgres/market-loan';
import { buildPostgresMarketLoan } from '@nftfi.api/repositories/postgres/factories/market-loan';
import { createTypeormRepositoryMock } from '@nftfi.api/repositories/factories';
import { httpValidationPipe } from '@nftfi.api/validation/api-validation.pipe';
import { FxRateConfigToken } from '@nftfi.api/modules/fx-rate-provider';
import { LoanV02Controller, LoanV02Service } from '../src/loan-legacy';

describe(LoanV02Controller.name, () => {
  let app: INestApplication;
  let loanRepository: MarketLoanRepository;
  let assetsFacade: AssetsFacade;

  beforeAll(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2022-10-17T16:32:36.000Z'));
  });

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            (): object => ({
              pagination: {
                limit: 20,
                page: 1
              }
            })
          ]
        })
      ],
      controllers: [LoanV02Controller],
      providers: [
        LoanV02Service,
        MarketLoanRepository,
        { provide: getRepositoryToken(MarketLoan), useValue: createTypeormRepositoryMock<MarketLoan>() },
        { provide: FxRateConfigToken, useValue: { ethusdt: 2000 } },
        {
          provide: SupportedCurrencies,
          useValue: new SupportedCurrencies({
            WETH: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
            DAI: '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844',
            USDC: '0x07865c6e87b9f70255377e024ace6630c1eaa37f'
          })
        },
        {
          provide: AssetsFacade,
          useValue: {
            getAssetByKey: jest.fn(),
            getAssetsByKeys: jest.fn(),
            getAssets: jest.fn()
          }
        }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    loanRepository = moduleRef.get(MarketLoanRepository);
    assetsFacade = moduleRef.get(AssetsFacade);

    app.useGlobalPipes(httpValidationPipe);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe(LoanV02Controller.prototype.handleGet.name, () => {
    const assetDto = buildAssetDto({
      contract: '0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b',
      tokenId: '810187',
      name: 'MultiFaucet Test NFT',
      imageSmallUrl: 'https://ipfs.io/ipfs/bafybeifvwitulq6elvka2hoqhwixfhgb42l4aiukmtrw335osetikviuuu',
      collection: buildCollectionDto({ name: 'MultiFaucet NFT' })
    });

    it('gets active loans', async () => {
      const loan = buildPostgresMarketLoan({
        loanId: '67',
        contract: '0x88341d1a8f672d2780c8dc725902aae72f143b0c',
        protocol: MarketLoanProtocol.Nftfi,
        status: MarketLoanStatus.Active,
        nftContract: '0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b',
        nftTokenId: '810187',
        borrower: '0x8a32121d737ce9c7b7b6e17cc7f10d7c2d5f8adc',
        lender: '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d',
        currency: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        principal: '1000000000000000',
        repaymentMax: '1029590000000',
        originationFee: '0',
        apr: 12.000388888888889,
        eapr: 12.000388888888889,
        duration: 7776000,
        startedAt: new Date('2022-10-17T16:32:36.000Z'),
        dueAt: new Date('2023-01-15T16:32:36.000Z'),
        endedAt: null,
        prorated: false
      });

      const fnFind = jest.spyOn(loanRepository, 'find').mockResolvedValue([loan]);
      const fnCount = jest.spyOn(loanRepository, 'count').mockResolvedValue(1);
      const fnGetAssets = jest.spyOn(assetsFacade, 'getAssets').mockResolvedValue([assetDto]);

      const response = await request(app.getHttpServer()).get(
        '/v0.2/loans?status=active&sortBy=dueDate&sortDirection=desc'
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        results: [
          {
            id: 67,
            status: 'active',
            date: {
              started: '2022-10-17T16:32:36.000Z',
              repaid: null,
              due: '2023-01-15T16:32:36.000Z'
            },
            nft: {
              id: '810187',
              address: '0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b',
              name: 'MultiFaucet Test NFT',
              project: { name: 'MultiFaucet NFT' },
              image: { uri: 'https://ipfs.io/ipfs/bafybeifvwitulq6elvka2hoqhwixfhgb42l4aiukmtrw335osetikviuuu' }
            },
            borrower: { address: '0x8a32121d737ce9c7b7b6e17cc7f10d7c2d5f8adc' },
            lender: { address: '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d' },
            terms: {
              loan: {
                duration: 7776000,
                repayment: '1029590000000',
                principal: '1000000000000000',
                apr: 12.000388888888889,
                effectiveApr: 12.000388888888889,
                origination: '0',
                interest: {
                  bps: 2.959,
                  prorated: false
                },
                currency: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                unit: 'ether'
              }
            },
            nftfi: { contract: { name: '0x88341d1a8f672d2780c8dc725902aae72f143b0c' } }
          }
        ],
        pagination: { total: 1 }
      });

      expect(fnGetAssets).toHaveBeenCalledWith({
        keys: [{ contract: '0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b', tokenId: '810187' }]
      });
      expect(fnFind).toHaveBeenCalledTimes(1);
      expect(fnFind).toHaveBeenCalledWith(
        {
          protocols: ['nftfi'],
          statuses: ['active'],
          borrower: undefined,
          lender: undefined,
          nftContracts: undefined
        },
        { skip: 0, limit: 100, sort: { by: 'dueAt', direction: 'DESC' } }
      );
      expect(fnCount).toHaveBeenCalledWith({
        protocols: ['nftfi'],
        statuses: ['active'],
        borrower: undefined,
        lender: undefined,
        nftContracts: undefined
      });
    });

    it('gets repaid loans', async () => {
      const loan = buildPostgresMarketLoan({
        loanId: '67',
        contract: '0x88341d1a8f672d2780c8dc725902aae72f143b0c',
        status: MarketLoanStatus.Repaid,
        nftContract: '0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b',
        nftTokenId: '810187',
        borrower: '0x8a32121d737ce9c7b7b6e17cc7f10d7c2d5f8adc',
        lender: '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d',
        currency: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        principal: '1000000000000000',
        repaymentMax: '1029590000000',
        originationFee: '0',
        apr: 12.000388888888889,
        eapr: 12.000388888888889,
        duration: 7776000,
        startedAt: new Date('2022-10-17T16:32:36.000Z'),
        dueAt: new Date('2023-01-15T16:32:36.000Z'),
        endedAt: null,
        prorated: false
      });

      const fnFind = jest.spyOn(loanRepository, 'find').mockResolvedValue([loan]);
      const fnCount = jest.spyOn(loanRepository, 'count').mockResolvedValue(1);
      const fnGetAssets = jest.spyOn(assetsFacade, 'getAssets').mockResolvedValue([assetDto]);

      const response = await request(app.getHttpServer()).get('/v0.2/loans?status=repaid');

      expect(response.status).toBe(200);
      expect(response.body.results[0].status).toBe('repaid');
      expect(fnFind).toHaveBeenCalledTimes(1);
      expect(fnFind).toHaveBeenCalledWith(
        {
          protocols: ['nftfi'],
          statuses: ['repaid'],
          borrower: undefined,
          lender: undefined,
          nftContracts: undefined
        },
        { skip: 0, limit: 100, sort: undefined }
      );
      expect(fnCount).toHaveBeenCalledTimes(1);
      expect(fnGetAssets).toHaveBeenCalledTimes(1);
    });

    it('gets liquidated loans', async () => {
      jest.spyOn(loanRepository, 'find').mockResolvedValue([]);
      jest.spyOn(loanRepository, 'count').mockResolvedValue(0);
      jest.spyOn(assetsFacade, 'getAssets').mockResolvedValue([]);

      const response = await request(app.getHttpServer()).get('/v0.2/loans?status=liquidated');

      expect(response.status).toBe(200);
      expect(loanRepository.find).toHaveBeenCalledWith(
        {
          protocols: ['nftfi'],
          statuses: ['liquidated'],
          borrower: undefined,
          lender: undefined,
          nftContracts: undefined
        },
        { skip: 0, limit: 100, sort: undefined }
      );
    });

    it('gets defaulted loans', async () => {
      jest.spyOn(loanRepository, 'find').mockResolvedValue([]);
      jest.spyOn(loanRepository, 'count').mockResolvedValue(0);
      jest.spyOn(assetsFacade, 'getAssets').mockResolvedValue([]);

      const response = await request(app.getHttpServer()).get('/v0.2/loans?status=defaulted');

      expect(response.status).toBe(200);
      expect(loanRepository.find).toHaveBeenCalledWith(
        {
          protocols: ['nftfi'],
          statuses: ['defaulted'],
          borrower: undefined,
          lender: undefined,
          nftContracts: undefined
        },
        { skip: 0, limit: 100, sort: undefined }
      );
    });

    it('requires status query param', async () => {
      const response = await request(app.getHttpServer()).get('/v0.2/loans');

      expect(response.status).toBe(422);
      expect(response.body).toEqual({
        errors: { status: ['status must be one of the following values: liquidated, active, defaulted, repaid'] }
      });
    });

    it('rejects invalid ethereum addresses', async () => {
      const fnFind = jest.spyOn(loanRepository, 'find');
      const response = await request(app.getHttpServer()).get(
        '/v0.2/loans?status=active&borrowerAddress=notAnAddress&lenderAddress=0x123&nftAddresses=0x1,0x2'
      );

      expect(response.status).toBe(422);
      expect(response.body).toEqual({
        errors: {
          borrowerAddress: ['borrowerAddress must be an Ethereum address'],
          lenderAddress: ['lenderAddress must be an Ethereum address'],
          nftAddresses: ['each value in nftAddresses must be an Ethereum address']
        }
      });
      expect(fnFind).not.toHaveBeenCalled();
    });

    it('rejects unsupported status values', async () => {
      const fnFind = jest.spyOn(loanRepository, 'find');
      const response = await request(app.getHttpServer()).get('/v0.2/loans?status=pending');

      expect(response.status).toBe(422);
      expect(response.body).toEqual({
        errors: { status: ['status must be one of the following values: liquidated, active, defaulted, repaid'] }
      });
      expect(fnFind).not.toHaveBeenCalled();
    });

    it('rejects unsupported sort options', async () => {
      const fnFind = jest.spyOn(loanRepository, 'find');
      const response = await request(app.getHttpServer()).get(
        '/v0.2/loans?status=active&sortBy=unknown&sortDirection=up'
      );

      expect(response.status).toBe(422);
      expect(response.body).toEqual({
        errors: {
          sortBy: ['sortBy must be one of the following values: repayment, interest, apr, duration, dueDate, nftName'],
          sortDirection: ['sortDirection must be one of the following values: asc, desc']
        }
      });
      expect(fnFind).not.toHaveBeenCalled();
    });

    it('gets loans by borrower', async () => {
      const fnFind = jest.spyOn(loanRepository, 'find').mockResolvedValue([]);
      jest.spyOn(loanRepository, 'count').mockResolvedValue(0);
      jest.spyOn(assetsFacade, 'getAssets').mockResolvedValue([]);

      const response = await request(app.getHttpServer()).get(
        '/v0.2/loans?status=active&borrowerAddress=0x8a32121d737ce9c7b7b6e17cc7f10d7c2d5f8adc'
      );

      expect(response.status).toBe(200);
      expect(fnFind).toHaveBeenCalledTimes(1);
      expect(fnFind).toHaveBeenCalledWith(
        {
          protocols: ['nftfi'],
          statuses: ['active'],
          borrower: '0x8a32121d737ce9c7b7b6e17cc7f10d7c2d5f8adc',
          lender: undefined,
          nftContracts: undefined
        },
        { skip: 0, limit: 100, sort: undefined }
      );
    });

    it('gets loans by lender', async () => {
      const fnFind = jest.spyOn(loanRepository, 'find').mockResolvedValue([]);
      jest.spyOn(loanRepository, 'count').mockResolvedValue(0);
      jest.spyOn(assetsFacade, 'getAssets').mockResolvedValue([]);

      const response = await request(app.getHttpServer()).get(
        '/v0.2/loans?status=active&lenderAddress=0x8a32121d737ce9c7b7b6e17cc7f10d7c2d5f8adc'
      );

      expect(response.status).toBe(200);
      expect(fnFind).toHaveBeenCalledTimes(1);
      expect(fnFind).toHaveBeenCalledWith(
        {
          protocols: ['nftfi'],
          statuses: ['active'],
          borrower: undefined,
          lender: '0x8a32121d737ce9c7b7b6e17cc7f10d7c2d5f8adc',
          nftContracts: undefined
        },
        { skip: 0, limit: 100, sort: undefined }
      );
    });

    it('gets loans by nft contract addressses', async () => {
      const fnFind = jest.spyOn(loanRepository, 'find').mockResolvedValue([]);
      jest.spyOn(loanRepository, 'count').mockResolvedValue(0);
      jest.spyOn(assetsFacade, 'getAssets').mockResolvedValue([]);

      const response = await request(app.getHttpServer()).get(
        '/v0.2/loans?status=active&nftAddresses=0x8a32121d737ce9c7b7b6e17cc7f10d7c2d5f8adc'
      );

      expect(response.status).toBe(200);
      expect(fnFind).toHaveBeenCalledTimes(1);
      expect(fnFind).toHaveBeenCalledWith(
        {
          protocols: ['nftfi'],
          statuses: ['active'],
          borrower: undefined,
          lender: undefined,
          nftContracts: ['0x8a32121d737ce9c7b7b6e17cc7f10d7c2d5f8adc']
        },
        { skip: 0, limit: 100, sort: undefined }
      );
    });

    it('requires sortDirection when sortBy is provided', async () => {
      const response = await request(app.getHttpServer()).get('/v0.2/loans?status=active&sortBy=repayment');

      expect(response.status).toBe(422);
      expect(response.body).toEqual({
        errors: { sortDirection: ['sortDirection must be one of the following values: asc, desc'] }
      });
    });

    it('requires pagination limit to be max 200', async () => {
      const response = await request(app.getHttpServer()).get('/v0.2/loans?status=active&limit=201');

      expect(response.status).toBe(422);
      expect(response.body).toEqual({
        errors: {
          limit: ['limit must not be greater than 200']
        }
      });
    });
  });
});
