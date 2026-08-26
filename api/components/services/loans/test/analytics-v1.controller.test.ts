import { INestApplication } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  MarketLoanAnalyticsRepository,
  MarketLoanProtocol,
  ProtocolBreakdownItem,
  CurrencyBreakdownItem,
  StatsByBorrowerItem,
  StatsByLenderItem,
  StatsByCollectionItem,
  StatsByWalletItem,
  StatsByDayItem,
  SummaryItem
} from '@nftfi.api/repositories/postgres/market-loan';
import { httpValidationPipe } from '@nftfi.api/validation/api-validation.pipe';
import { AnalyticsV1Controller, AnalyticsV1Service } from '../src/analytics-v1';

describe(AnalyticsV1Controller.name, () => {
  let app: INestApplication;
  let analyticsRepository: MarketLoanAnalyticsRepository;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [AnalyticsV1Controller],
      providers: [
        AnalyticsV1Service,
        {
          provide: MarketLoanAnalyticsRepository,
          useValue: {
            getProtocolBreakdown: jest.fn(),
            getCurrencyBreakdown: jest.fn(),
            getStatsByBorrower: jest.fn(),
            countStatsByBorrower: jest.fn(),
            getStatsByLender: jest.fn(),
            countStatsByLender: jest.fn(),
            getStatsByCollection: jest.fn(),
            countStatsByCollection: jest.fn(),
            getStatsByWallet: jest.fn(),
            getSummary: jest.fn(),
            getStatsByDay: jest.fn()
          }
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            store: {
              keys: jest.fn(),
              del: jest.fn()
            }
          }
        }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    analyticsRepository = moduleRef.get(MarketLoanAnalyticsRepository);

    app.useGlobalPipes(httpValidationPipe);

    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  describe(AnalyticsV1Controller.prototype.getProtocolBreakdown.name, () => {
    it('returns protocol breakdown without filters', async () => {
      const result = [
        { protocol: 'nftfi', total: 1500.5 },
        { protocol: 'arcade', total: 800.25 }
      ];
      const fn = jest.spyOn(analyticsRepository, 'getProtocolBreakdown').mockResolvedValue(result);

      const response = await request(app.getHttpServer()).get('/v1/analytics/protocol-breakdown');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(result);
      expect(fn).toHaveBeenCalledWith({
        daysFromNow: undefined,
        protocols: undefined,
        currencies: undefined,
        wallets: undefined,
        lender: undefined,
        borrower: undefined,
        collectionIds: undefined
      });
    });

    it('passes daysFromNow and protocols filters to repository', async () => {
      const fn = jest.spyOn(analyticsRepository, 'getProtocolBreakdown').mockResolvedValue([]);

      const response = await request(app.getHttpServer()).get(
        '/v1/analytics/protocol-breakdown?daysFromNow=7&protocols=nftfi,arcade'
      );

      expect(response.status).toBe(200);
      expect(fn).toHaveBeenCalledWith({
        daysFromNow: 7,
        protocols: [MarketLoanProtocol.Nftfi, MarketLoanProtocol.Arcade],
        currencies: undefined,
        wallets: undefined,
        lender: undefined,
        borrower: undefined,
        collectionIds: undefined
      });
    });

    it('passes currencies and collectionIds filters', async () => {
      const fn = jest.spyOn(analyticsRepository, 'getProtocolBreakdown').mockResolvedValue([]);

      const response = await request(app.getHttpServer()).get(
        '/v1/analytics/protocol-breakdown?currencies=0x6B175474E89094C44DA98B954EEDEAC495271D0F&collectionIds=10,20'
      );

      expect(response.status).toBe(200);
      expect(fn).toHaveBeenCalledWith({
        daysFromNow: undefined,
        protocols: undefined,
        currencies: ['0x6b175474e89094c44da98b954eedeac495271d0f'],
        wallets: undefined,
        lender: undefined,
        borrower: undefined,
        collectionIds: [10, 20]
      });
    });

    it('rejects invalid daysFromNow', async () => {
      const response = await request(app.getHttpServer()).get('/v1/analytics/protocol-breakdown?daysFromNow=0');

      expect(response.status).toBe(422);
    });

    it('strips extraneous fields from the serialized response', async () => {
      jest.spyOn(analyticsRepository, 'getProtocolBreakdown').mockResolvedValue([
        {
          protocol: 'nftfi',
          total: 1500.5,
          '_constructor-name_': 'ProtocolBreakdownDto',
          leakedInternal: 'should-not-appear'
        } as unknown as ProtocolBreakdownItem
      ]);

      const response = await request(app.getHttpServer()).get('/v1/analytics/protocol-breakdown');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([{ protocol: 'nftfi', total: 1500.5 }]);
      expect(response.body[0]).not.toHaveProperty('_constructor-name_');
      expect(response.body[0]).not.toHaveProperty('leakedInternal');
    });
  });

  describe(AnalyticsV1Controller.prototype.getCurrencyBreakdown.name, () => {
    it('returns currency breakdown without filters', async () => {
      const result = [{ currency: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', totalUsd: 5000, totalNative: 2.5 }];
      const fn = jest.spyOn(analyticsRepository, 'getCurrencyBreakdown').mockResolvedValue(result);

      const response = await request(app.getHttpServer()).get('/v1/analytics/currency-breakdown');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(result);
      expect(fn).toHaveBeenCalledWith({
        daysFromNow: undefined,
        protocols: undefined,
        currencies: undefined,
        wallets: undefined,
        lender: undefined,
        borrower: undefined,
        collectionIds: undefined
      });
    });

    it('passes lender and borrower filters', async () => {
      const fn = jest.spyOn(analyticsRepository, 'getCurrencyBreakdown').mockResolvedValue([]);

      const response = await request(app.getHttpServer()).get(
        '/v1/analytics/currency-breakdown?lender=0x053DD3E4D764F487F16E7BF2247B14EB4C1C667D&borrower=0x8A32121D737CE9C7B7B6E17CC7F10D7C2D5F8ADC'
      );

      expect(response.status).toBe(200);
      expect(fn).toHaveBeenCalledWith({
        daysFromNow: undefined,
        protocols: undefined,
        currencies: undefined,
        wallets: undefined,
        lender: '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d',
        borrower: '0x8a32121d737ce9c7b7b6e17cc7f10d7c2d5f8adc',
        collectionIds: undefined
      });
    });

    it('passes wallets filter', async () => {
      const fn = jest.spyOn(analyticsRepository, 'getCurrencyBreakdown').mockResolvedValue([]);

      const response = await request(app.getHttpServer()).get(
        '/v1/analytics/currency-breakdown?wallets=0x053DD3E4D764F487F16E7BF2247B14EB4C1C667D,0x8A32121D737CE9C7B7B6E17CC7F10D7C2D5F8ADC'
      );

      expect(response.status).toBe(200);
      expect(fn).toHaveBeenCalledWith({
        daysFromNow: undefined,
        protocols: undefined,
        currencies: undefined,
        wallets: ['0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d', '0x8a32121d737ce9c7b7b6e17cc7f10d7c2d5f8adc'],
        lender: undefined,
        borrower: undefined,
        collectionIds: undefined
      });
    });

    it('strips extraneous fields from the serialized response', async () => {
      jest.spyOn(analyticsRepository, 'getCurrencyBreakdown').mockResolvedValue([
        {
          currency: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
          totalUsd: 5000,
          totalNative: 2.5,
          '_constructor-name_': 'CurrencyBreakdownDto',
          leakedInternal: 'should-not-appear'
        } as unknown as CurrencyBreakdownItem
      ]);

      const response = await request(app.getHttpServer()).get('/v1/analytics/currency-breakdown');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        { currency: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', totalUsd: 5000, totalNative: 2.5 }
      ]);
      expect(response.body[0]).not.toHaveProperty('_constructor-name_');
      expect(response.body[0]).not.toHaveProperty('leakedInternal');
    });
  });

  describe(AnalyticsV1Controller.prototype.getSummary.name, () => {
    const summaryResult = {
      totalUsdValue: 10000,
      totalRepaymentUsd: 8000,
      avgUsdValue: 500,
      avgApr: 15.5,
      weightedAvgApr: 14.2,
      weightedAvgDuration: 45,
      loanCount: 20,
      lendedLoansCount: 0,
      borrowedLoansCount: 0,
      totalEthValueOfEthLoans: 5.5,
      totalUsdValueOfUsdLoans: 3000,
      totalInterestEthOfEthLoans: 0.25,
      totalInterestUsdOfUsdLoans: 150,
      totalPrincipalEthOfEthLoans: 5.25,
      totalPrincipalUsdOfUsdLoans: 2850
    };

    it('returns summary without filters', async () => {
      const fn = jest.spyOn(analyticsRepository, 'getSummary').mockResolvedValue(summaryResult);

      const response = await request(app.getHttpServer()).get('/v1/analytics/summary');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(summaryResult);
      expect(fn).toHaveBeenCalledWith({
        daysFromNow: undefined,
        protocols: undefined,
        currencies: undefined,
        wallets: undefined,
        lender: undefined,
        borrower: undefined,
        collectionIds: undefined
      });
    });

    it('passes daysFromNow and protocols filters', async () => {
      const fn = jest.spyOn(analyticsRepository, 'getSummary').mockResolvedValue(summaryResult);

      const response = await request(app.getHttpServer()).get('/v1/analytics/summary?daysFromNow=30&protocols=nftfi');

      expect(response.status).toBe(200);
      expect(fn).toHaveBeenCalledWith({
        daysFromNow: 30,
        protocols: [MarketLoanProtocol.Nftfi],
        currencies: undefined,
        wallets: undefined,
        lender: undefined,
        borrower: undefined,
        collectionIds: undefined
      });
    });

    it('passes lender filter', async () => {
      const fn = jest.spyOn(analyticsRepository, 'getSummary').mockResolvedValue(summaryResult);

      const response = await request(app.getHttpServer()).get(
        '/v1/analytics/summary?lender=0x053DD3E4D764F487F16E7BF2247B14EB4C1C667D'
      );

      expect(response.status).toBe(200);
      expect(fn).toHaveBeenCalledWith({
        daysFromNow: undefined,
        protocols: undefined,
        currencies: undefined,
        wallets: undefined,
        lender: '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d',
        borrower: undefined,
        collectionIds: undefined
      });
    });

    it('rejects invalid daysFromNow', async () => {
      const response = await request(app.getHttpServer()).get('/v1/analytics/summary?daysFromNow=0');

      expect(response.status).toBe(422);
    });

    it('strips extraneous fields from the serialized response', async () => {
      jest.spyOn(analyticsRepository, 'getSummary').mockResolvedValue({
        ...summaryResult,
        '_constructor-name_': 'SummaryDto',
        leakedInternal: 'should-not-appear'
      } as unknown as SummaryItem);

      const response = await request(app.getHttpServer()).get('/v1/analytics/summary');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        totalUsdValue: 10000,
        totalRepaymentUsd: 8000,
        avgUsdValue: 500,
        avgApr: 15.5,
        weightedAvgApr: 14.2,
        weightedAvgDuration: 45,
        loanCount: 20,
        lendedLoansCount: 0,
        borrowedLoansCount: 0,
        totalEthValueOfEthLoans: 5.5,
        totalUsdValueOfUsdLoans: 3000,
        totalInterestEthOfEthLoans: 0.25,
        totalInterestUsdOfUsdLoans: 150,
        totalPrincipalEthOfEthLoans: 5.25,
        totalPrincipalUsdOfUsdLoans: 2850
      });
      expect(response.body).not.toHaveProperty('_constructor-name_');
      expect(response.body).not.toHaveProperty('leakedInternal');
    });
  });

  describe(AnalyticsV1Controller.prototype.getStatsByDay.name, () => {
    const statsByDayResult = [
      { dueDay: '2026-04-10', totalUsdValue: 5000, avgUsdValue: 2500, avgApr: 12.5, loanCount: 2 },
      { dueDay: '2026-04-11', totalUsdValue: 8000, avgUsdValue: 4000, avgApr: 15.0, loanCount: 2 }
    ];

    it('returns stats-by-day without filters', async () => {
      const fn = jest.spyOn(analyticsRepository, 'getStatsByDay').mockResolvedValue(statsByDayResult);

      const response = await request(app.getHttpServer()).get('/v1/analytics/stats-by-day');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(statsByDayResult);
      expect(fn).toHaveBeenCalledWith(
        {
          daysFromNow: undefined,
          protocols: undefined,
          currencies: undefined,
          wallets: undefined,
          lender: undefined,
          borrower: undefined,
          collectionIds: undefined
        },
        undefined
      );
    });

    it('passes daysFromNow, protocols, and timezone', async () => {
      const fn = jest.spyOn(analyticsRepository, 'getStatsByDay').mockResolvedValue([]);

      const response = await request(app.getHttpServer()).get(
        '/v1/analytics/stats-by-day?daysFromNow=7&protocols=nftfi,gondi&timezone=America/New_York'
      );

      expect(response.status).toBe(200);
      expect(fn).toHaveBeenCalledWith(
        {
          daysFromNow: 7,
          protocols: [MarketLoanProtocol.Nftfi, MarketLoanProtocol.Gondi],
          currencies: undefined,
          wallets: undefined,
          lender: undefined,
          borrower: undefined,
          collectionIds: undefined
        },
        'America/New_York'
      );
    });

    it('rejects invalid daysFromNow', async () => {
      const response = await request(app.getHttpServer()).get('/v1/analytics/stats-by-day?daysFromNow=0');

      expect(response.status).toBe(422);
    });

    it('rejects invalid timezone', async () => {
      const response = await request(app.getHttpServer()).get(
        '/v1/analytics/stats-by-day?timezone=2026-04-15T00%3A00%3A00.000Z'
      );

      expect(response.status).toBe(422);
      expect(analyticsRepository.getStatsByDay).not.toHaveBeenCalled();
    });

    it('strips extraneous fields from the serialized response', async () => {
      jest.spyOn(analyticsRepository, 'getStatsByDay').mockResolvedValue([
        {
          dueDay: '2026-04-10',
          totalUsdValue: 5000,
          avgUsdValue: 2500,
          avgApr: 12.5,
          loanCount: 2,
          '_constructor-name_': 'StatsByDayDto',
          leakedInternal: 'should-not-appear'
        } as unknown as StatsByDayItem
      ]);

      const response = await request(app.getHttpServer()).get('/v1/analytics/stats-by-day');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        { dueDay: '2026-04-10', totalUsdValue: 5000, avgUsdValue: 2500, avgApr: 12.5, loanCount: 2 }
      ]);
      expect(response.body[0]).not.toHaveProperty('_constructor-name_');
      expect(response.body[0]).not.toHaveProperty('leakedInternal');
    });
  });

  describe(AnalyticsV1Controller.prototype.getStatsByBorrower.name, () => {
    it('returns stats-by-borrower with default pagination and headers', async () => {
      const result = [{ borrower: '0xabc', totalUsdValue: 1000, avgUsdValue: 500, avgApr: 12.5, loanCount: 2 }];
      const fn = jest.spyOn(analyticsRepository, 'getStatsByBorrower').mockResolvedValue(result);
      jest.spyOn(analyticsRepository, 'countStatsByBorrower').mockResolvedValue(42);

      const response = await request(app.getHttpServer()).get('/v1/analytics/stats-by-borrower');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(result);
      expect(response.headers['x-pagination-page']).toBe('1');
      expect(response.headers['x-pagination-limit']).toBe('100');
      expect(response.headers['x-pagination-total']).toBe('42');
      expect(fn).toHaveBeenCalledWith(
        {
          daysFromNow: undefined,
          protocols: undefined,
          currencies: undefined,
          wallets: undefined,
          lender: undefined,
          borrower: undefined,
          collectionIds: undefined
        },
        {
          page: 0,
          pageSize: 100,
          sortBy: undefined,
          sortOrder: 'DESC'
        }
      );
    });

    it('passes pagination and sorting parameters with headers', async () => {
      const fn = jest.spyOn(analyticsRepository, 'getStatsByBorrower').mockResolvedValue([]);
      jest.spyOn(analyticsRepository, 'countStatsByBorrower').mockResolvedValue(150);

      const response = await request(app.getHttpServer()).get(
        '/v1/analytics/stats-by-borrower?page=3&limit=50&sortBy=avgApr&sortDirection=asc'
      );

      expect(response.status).toBe(200);
      expect(response.headers['x-pagination-page']).toBe('3');
      expect(response.headers['x-pagination-limit']).toBe('50');
      expect(response.headers['x-pagination-total']).toBe('150');
      expect(fn).toHaveBeenCalledWith(
        {
          daysFromNow: undefined,
          protocols: undefined,
          currencies: undefined,
          wallets: undefined,
          lender: undefined,
          borrower: undefined,
          collectionIds: undefined
        },
        {
          page: 2,
          pageSize: 50,
          sortBy: 'avgApr',
          sortOrder: 'ASC'
        }
      );
    });

    it('passes all filters with pagination', async () => {
      const fn = jest.spyOn(analyticsRepository, 'getStatsByBorrower').mockResolvedValue([]);
      jest.spyOn(analyticsRepository, 'countStatsByBorrower').mockResolvedValue(5);

      const response = await request(app.getHttpServer()).get(
        '/v1/analytics/stats-by-borrower?daysFromNow=30&protocols=nftfi&currencies=0x6B175474E89094C44DA98B954EEDEAC495271D0F&collectionIds=5&page=2&limit=25&sortBy=totalUsdValue&sortDirection=desc'
      );

      expect(response.status).toBe(200);
      expect(fn).toHaveBeenCalledWith(
        {
          daysFromNow: 30,
          protocols: [MarketLoanProtocol.Nftfi],
          currencies: ['0x6b175474e89094c44da98b954eedeac495271d0f'],
          wallets: undefined,
          lender: undefined,
          borrower: undefined,
          collectionIds: [5]
        },
        {
          page: 1,
          pageSize: 25,
          sortBy: 'totalUsdValue',
          sortOrder: 'DESC'
        }
      );
    });

    it('rejects limit exceeding max', async () => {
      const response = await request(app.getHttpServer()).get('/v1/analytics/stats-by-borrower?limit=201');

      expect(response.status).toBe(422);
    });

    it('rejects invalid sortBy value', async () => {
      const response = await request(app.getHttpServer()).get('/v1/analytics/stats-by-borrower?sortBy=invalid');

      expect(response.status).toBe(422);
    });

    it('rejects invalid sortDirection value', async () => {
      const response = await request(app.getHttpServer()).get(
        '/v1/analytics/stats-by-borrower?sortBy=avgApr&sortDirection=invalid'
      );

      expect(response.status).toBe(422);
    });

    it('strips extraneous fields from the serialized response', async () => {
      jest.spyOn(analyticsRepository, 'getStatsByBorrower').mockResolvedValue([
        {
          borrower: '0xabc',
          totalUsdValue: 1000,
          avgUsdValue: 500,
          avgApr: 12.5,
          loanCount: 2,
          '_constructor-name_': 'StatsByBorrowerDto',
          leakedInternal: 'should-not-appear'
        } as unknown as StatsByBorrowerItem
      ]);
      jest.spyOn(analyticsRepository, 'countStatsByBorrower').mockResolvedValue(1);

      const response = await request(app.getHttpServer()).get('/v1/analytics/stats-by-borrower');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        { borrower: '0xabc', totalUsdValue: 1000, avgUsdValue: 500, avgApr: 12.5, loanCount: 2 }
      ]);
      expect(response.body[0]).not.toHaveProperty('_constructor-name_');
      expect(response.body[0]).not.toHaveProperty('leakedInternal');
    });
  });

  describe(AnalyticsV1Controller.prototype.getStatsByLender.name, () => {
    it('returns stats-by-lender with default pagination and headers', async () => {
      const result = [{ lender: '0xdef', totalUsdValue: 3000, avgUsdValue: 1500, avgApr: 8.5, loanCount: 5 }];
      const fn = jest.spyOn(analyticsRepository, 'getStatsByLender').mockResolvedValue(result);
      jest.spyOn(analyticsRepository, 'countStatsByLender').mockResolvedValue(77);

      const response = await request(app.getHttpServer()).get('/v1/analytics/stats-by-lender');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(result);
      expect(response.headers['x-pagination-page']).toBe('1');
      expect(response.headers['x-pagination-limit']).toBe('100');
      expect(response.headers['x-pagination-total']).toBe('77');
      expect(fn).toHaveBeenCalledWith(
        {
          daysFromNow: undefined,
          protocols: undefined,
          currencies: undefined,
          wallets: undefined,
          lender: undefined,
          borrower: undefined,
          collectionIds: undefined
        },
        {
          page: 0,
          pageSize: 100,
          sortBy: undefined,
          sortOrder: 'DESC'
        }
      );
    });

    it('passes pagination and sorting parameters with headers', async () => {
      const fn = jest.spyOn(analyticsRepository, 'getStatsByLender').mockResolvedValue([]);
      jest.spyOn(analyticsRepository, 'countStatsByLender').mockResolvedValue(200);

      const response = await request(app.getHttpServer()).get(
        '/v1/analytics/stats-by-lender?page=2&limit=25&sortBy=loanCount&sortDirection=asc'
      );

      expect(response.status).toBe(200);
      expect(response.headers['x-pagination-page']).toBe('2');
      expect(response.headers['x-pagination-limit']).toBe('25');
      expect(response.headers['x-pagination-total']).toBe('200');
      expect(fn).toHaveBeenCalledWith(
        {
          daysFromNow: undefined,
          protocols: undefined,
          currencies: undefined,
          wallets: undefined,
          lender: undefined,
          borrower: undefined,
          collectionIds: undefined
        },
        {
          page: 1,
          pageSize: 25,
          sortBy: 'loanCount',
          sortOrder: 'ASC'
        }
      );
    });

    it('passes all filters with pagination', async () => {
      const fn = jest.spyOn(analyticsRepository, 'getStatsByLender').mockResolvedValue([]);
      jest.spyOn(analyticsRepository, 'countStatsByLender').mockResolvedValue(3);

      const response = await request(app.getHttpServer()).get(
        '/v1/analytics/stats-by-lender?daysFromNow=14&protocols=nftfi&currencies=0x6B175474E89094C44DA98B954EEDEAC495271D0F&collectionIds=5&page=1&limit=10&sortBy=avgApr&sortDirection=desc'
      );

      expect(response.status).toBe(200);
      expect(fn).toHaveBeenCalledWith(
        {
          daysFromNow: 14,
          protocols: [MarketLoanProtocol.Nftfi],
          currencies: ['0x6b175474e89094c44da98b954eedeac495271d0f'],
          wallets: undefined,
          lender: undefined,
          borrower: undefined,
          collectionIds: [5]
        },
        {
          page: 0,
          pageSize: 10,
          sortBy: 'avgApr',
          sortOrder: 'DESC'
        }
      );
    });

    it('rejects limit exceeding max', async () => {
      const response = await request(app.getHttpServer()).get('/v1/analytics/stats-by-lender?limit=201');

      expect(response.status).toBe(422);
    });

    it('rejects invalid sortBy value', async () => {
      const response = await request(app.getHttpServer()).get('/v1/analytics/stats-by-lender?sortBy=invalid');

      expect(response.status).toBe(422);
    });

    it('rejects invalid sortDirection value', async () => {
      const response = await request(app.getHttpServer()).get(
        '/v1/analytics/stats-by-lender?sortBy=avgApr&sortDirection=invalid'
      );

      expect(response.status).toBe(422);
    });

    it('strips extraneous fields from the serialized response', async () => {
      jest.spyOn(analyticsRepository, 'getStatsByLender').mockResolvedValue([
        {
          lender: '0xdef',
          totalUsdValue: 3000,
          avgUsdValue: 1500,
          avgApr: 8.5,
          loanCount: 5,
          '_constructor-name_': 'StatsByLenderDto',
          leakedInternal: 'should-not-appear'
        } as unknown as StatsByLenderItem
      ]);
      jest.spyOn(analyticsRepository, 'countStatsByLender').mockResolvedValue(1);

      const response = await request(app.getHttpServer()).get('/v1/analytics/stats-by-lender');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        { lender: '0xdef', totalUsdValue: 3000, avgUsdValue: 1500, avgApr: 8.5, loanCount: 5 }
      ]);
      expect(response.body[0]).not.toHaveProperty('_constructor-name_');
      expect(response.body[0]).not.toHaveProperty('leakedInternal');
    });
  });

  describe(AnalyticsV1Controller.prototype.getStatsByCollection.name, () => {
    it('returns stats-by-collection with default pagination and headers', async () => {
      const result = [
        {
          collectionId: 1,
          collectionName: 'Bored Ape',
          collectionImageUrl: 'https://example.com/bayc.png',
          totalUsdValue: 50000,
          avgUsdValue: 25000,
          avgApr: 15.5,
          loanCount: 10,
          percentageOfTotal: 45.2
        }
      ];
      const fn = jest.spyOn(analyticsRepository, 'getStatsByCollection').mockResolvedValue(result);
      jest.spyOn(analyticsRepository, 'countStatsByCollection').mockResolvedValue(30);

      const response = await request(app.getHttpServer()).get('/v1/analytics/stats-by-collection');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(result);
      expect(response.headers['x-pagination-page']).toBe('1');
      expect(response.headers['x-pagination-limit']).toBe('100');
      expect(response.headers['x-pagination-total']).toBe('30');
      expect(fn).toHaveBeenCalledWith(
        {
          daysFromNow: undefined,
          protocols: undefined,
          currencies: undefined,
          wallets: undefined,
          lender: undefined,
          borrower: undefined,
          collectionIds: undefined
        },
        { page: 0, pageSize: 100 }
      );
    });

    it('passes filters and custom pagination', async () => {
      const fn = jest.spyOn(analyticsRepository, 'getStatsByCollection').mockResolvedValue([]);
      jest.spyOn(analyticsRepository, 'countStatsByCollection').mockResolvedValue(5);

      const response = await request(app.getHttpServer()).get(
        '/v1/analytics/stats-by-collection?daysFromNow=14&protocols=nftfi&page=2&limit=25'
      );

      expect(response.status).toBe(200);
      expect(response.headers['x-pagination-page']).toBe('2');
      expect(response.headers['x-pagination-limit']).toBe('25');
      expect(response.headers['x-pagination-total']).toBe('5');
      expect(fn).toHaveBeenCalledWith(
        {
          daysFromNow: 14,
          protocols: [MarketLoanProtocol.Nftfi],
          currencies: undefined,
          wallets: undefined,
          lender: undefined,
          borrower: undefined,
          collectionIds: undefined
        },
        { page: 1, pageSize: 25 }
      );
    });

    it('rejects limit exceeding max', async () => {
      const response = await request(app.getHttpServer()).get('/v1/analytics/stats-by-collection?limit=201');

      expect(response.status).toBe(422);
    });

    it('strips extraneous fields from the serialized response', async () => {
      jest.spyOn(analyticsRepository, 'getStatsByCollection').mockResolvedValue([
        {
          collectionId: 1,
          collectionName: 'Bored Ape',
          collectionImageUrl: 'https://example.com/bayc.png',
          totalUsdValue: 50000,
          avgUsdValue: 25000,
          avgApr: 15.5,
          loanCount: 10,
          percentageOfTotal: 45.2,
          '_constructor-name_': 'StatsByCollectionDto',
          leakedInternal: 'should-not-appear'
        } as unknown as StatsByCollectionItem
      ]);
      jest.spyOn(analyticsRepository, 'countStatsByCollection').mockResolvedValue(1);

      const response = await request(app.getHttpServer()).get('/v1/analytics/stats-by-collection');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          collectionId: 1,
          collectionName: 'Bored Ape',
          collectionImageUrl: 'https://example.com/bayc.png',
          totalUsdValue: 50000,
          avgUsdValue: 25000,
          avgApr: 15.5,
          loanCount: 10,
          percentageOfTotal: 45.2
        }
      ]);
      expect(response.body[0]).not.toHaveProperty('_constructor-name_');
      expect(response.body[0]).not.toHaveProperty('leakedInternal');
    });
  });

  describe(AnalyticsV1Controller.prototype.getStatsByWallet.name, () => {
    it('returns stats for a wallet', async () => {
      const result = {
        wallet: '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d',
        lenderLoansCount: 10,
        borrowerLoansCount: 3,
        lenderTotalAmountUsd: 5000,
        borrowerTotalAmountUsd: 1200
      };
      const fn = jest.spyOn(analyticsRepository, 'getStatsByWallet').mockResolvedValue(result);

      const response = await request(app.getHttpServer()).get(
        '/v1/analytics/stats-by-wallet?wallet=0x053DD3E4D764F487F16E7BF2247B14EB4C1C667D'
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual(result);
      expect(fn).toHaveBeenCalledWith('0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d');
    });

    it('rejects missing wallet parameter', async () => {
      const response = await request(app.getHttpServer()).get('/v1/analytics/stats-by-wallet');

      expect(response.status).toBe(422);
    });

    it('rejects invalid wallet address', async () => {
      const response = await request(app.getHttpServer()).get('/v1/analytics/stats-by-wallet?wallet=not-an-address');

      expect(response.status).toBe(422);
    });

    it('strips extraneous fields from the serialized response', async () => {
      jest.spyOn(analyticsRepository, 'getStatsByWallet').mockResolvedValue({
        wallet: '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d',
        lenderLoansCount: 10,
        borrowerLoansCount: 3,
        lenderTotalAmountUsd: 5000,
        borrowerTotalAmountUsd: 1200,
        '_constructor-name_': 'StatsByWalletDto',
        leakedInternal: 'should-not-appear'
      } as unknown as StatsByWalletItem);

      const response = await request(app.getHttpServer()).get(
        '/v1/analytics/stats-by-wallet?wallet=0x053DD3E4D764F487F16E7BF2247B14EB4C1C667D'
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        wallet: '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d',
        lenderLoansCount: 10,
        borrowerLoansCount: 3,
        lenderTotalAmountUsd: 5000,
        borrowerTotalAmountUsd: 1200
      });
      expect(response.body).not.toHaveProperty('_constructor-name_');
      expect(response.body).not.toHaveProperty('leakedInternal');
    });
  });
});
