import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { Ticker } from 'ccxt';
import { FxRateRepository } from '@nftfi.api/repositories/postgres/fx-rate';
import { FxRateDto, FxSymbol } from '@nftfi.api/facades/fx-rates';
import { FxRateClient, FxRateClientProvider } from '../src/fx-rate/fx-rate-client.provider';
import { FxRateService } from '../src/fx-rate/fx-rate.service';

describe(FxRateService.name, () => {
  let service: FxRateService;
  let repository: FxRateRepository;
  let fxClient: FxRateClient;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => void 0);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => void 0);

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-01-01T00:00:00Z'));
  });

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [
            (): object => ({
              fxrate: {
                startDate: new Date('2022-01-01T00:00:00Z')
              }
            })
          ]
        })
      ],
      providers: [
        FxRateService,
        {
          provide: FxRateRepository,
          useValue: { upsert: jest.fn(), findLatest: jest.fn(), findToDate: jest.fn() }
        },
        {
          provide: FxRateClientProvider.provide,
          useValue: {
            has: { fetchOHLCV: true, fetchTicker: true },
            parse8601: jest.fn().mockImplementation((dateStr: string) => new Date(dateStr).getTime()),
            fetchOHLCV: jest.fn(),
            fetchTicker: jest.fn(),
            loadMarkets: jest.fn().mockResolvedValue({
              'ETH/USDT': {}
            }),
            timeframes: {
              '1h': 3600000,
              '1d': 86400000
            },
            rateLimit: 1
          }
        }
      ]
    }).compile();

    service = moduleRef.get(FxRateService);
    repository = moduleRef.get(FxRateRepository);
    fxClient = moduleRef.get<FxRateClient>(FxRateClientProvider.provide);
  });

  describe(FxRateService.prototype.getLatest.name, () => {
    it('should get latest FX rate', async () => {
      const fnFindLatest = jest.spyOn(repository, 'findLatest').mockResolvedValueOnce({
        id: 1,
        symbol: FxSymbol.ETH_USDT,
        rate: 1.0,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await service.getLatest(FxSymbol.ETH_USDT);

      expect(fnFindLatest).toHaveBeenCalledTimes(1);
      expect(fnFindLatest).toHaveBeenCalledWith(FxSymbol.ETH_USDT);
      expect(result).toEqual({
        id: 1,
        symbol: FxSymbol.ETH_USDT,
        rate: 1.0,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });
  });

  describe(FxRateService.prototype.getAtDate.name, () => {
    it('should get the FX rate for a specific date', async () => {
      const date = new Date('2023-06-01T00:00:00Z');
      const fnFindAtDate = jest.spyOn(repository, 'findToDate').mockResolvedValueOnce({
        id: 2,
        symbol: FxSymbol.ETH_USDT,
        rate: 1.25,
        createdAt: date,
        updatedAt: date
      });

      const result = await service.getAtDate(FxSymbol.ETH_USDT, date);

      expect(fnFindAtDate).toHaveBeenCalledTimes(1);
      expect(fnFindAtDate).toHaveBeenCalledWith(FxSymbol.ETH_USDT, date);
      expect(result).toEqual({
        id: 2,
        symbol: FxSymbol.ETH_USDT,
        rate: 1.25,
        createdAt: date,
        updatedAt: date
      });
    });
  });

  describe(FxRateService.prototype.refreshEthUsdtRate.name, () => {
    it('should refresh ETH/USDT rate when no entry exists', async () => {
      const fnFindLatest = jest.spyOn(repository, 'findLatest').mockResolvedValueOnce(null);
      const fnRefreshHistorical = jest.spyOn(service, 'refreshHistoricalRates').mockResolvedValueOnce(10);

      await service.refreshEthUsdtRate();

      expect(fnFindLatest).toHaveBeenCalledTimes(1);
      expect(fnRefreshHistorical).toHaveBeenCalledTimes(1);
      expect(fnRefreshHistorical).toHaveBeenCalledWith(FxSymbol.ETH_USDT, '1h', expect.any(Date), expect.any(Date));
    });

    it('should refresh ETH/USDT rate when entry is outdated', async () => {
      const fnFindLatest = jest.spyOn(repository, 'findLatest').mockResolvedValueOnce({
        id: 1,
        symbol: FxSymbol.ETH_USDT,
        rate: 1.0,
        createdAt: new Date('2022-10-30T00:00:00Z'),
        updatedAt: new Date('2022-10-30T00:00:00Z')
      });
      const fnRefreshHistorical = jest.spyOn(service, 'refreshHistoricalRates').mockResolvedValueOnce(5);

      await service.refreshEthUsdtRate();

      expect(fnFindLatest).toHaveBeenCalledTimes(1);
      expect(fnRefreshHistorical).toHaveBeenCalledTimes(1);
      expect(fnRefreshHistorical).toHaveBeenCalledWith(FxSymbol.ETH_USDT, '1h', expect.any(Date), expect.any(Date));
    });

    it('should refresh ETH/USDT ticker rate when entry is up-to-date', async () => {
      const fnFindLatest = jest.spyOn(repository, 'findLatest').mockResolvedValueOnce({
        id: 1,
        symbol: FxSymbol.ETH_USDT,
        rate: 1.0,
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z')
      });
      const fnRefreshTicker = jest.spyOn(service, 'refreshTickerRates').mockResolvedValueOnce();

      await service.refreshEthUsdtRate();

      expect(fnFindLatest).toHaveBeenCalledTimes(1);
      expect(fnRefreshTicker).toHaveBeenCalledTimes(1);
      expect(fnRefreshTicker).toHaveBeenCalledWith(FxSymbol.ETH_USDT);
    });

    it('should throw error if client not ready', async () => {
      fxClient.has.fetchOHLCV = false;

      await expect(service.refreshEthUsdtRate()).rejects.toThrow(`Object does not support fetching OHLCV data`);
    });

    it('should throw error if timeframe not supported', async () => {
      delete fxClient.timeframes['1h'];

      await expect(service.refreshEthUsdtRate()).rejects.toThrow(`1h not supported by Object`);
    });

    it('should throw error if symbol not found', async () => {
      jest.spyOn(fxClient, 'loadMarkets').mockResolvedValueOnce({ 'BTC/USD': {} } as {});

      await expect(service.refreshEthUsdtRate()).rejects.toThrow(`ETH/USDT not found on Object`);
    });
  });

  describe(FxRateService.prototype.refreshHistoricalRates.name, () => {
    it('should refresh historical rates in batches', async () => {
      const fnFetch = jest
        .spyOn(fxClient, 'fetchOHLCV')
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          [1700000000000, 0, 0, 0, 1.0, 1],
          [1700086400000, 0, 0, 0, 1.1, 1]
        ])
        .mockResolvedValue([]);
      const fnUpsert = jest.spyOn(repository, 'upsert').mockResolvedValue();

      const promise = service.refreshHistoricalRates(
        FxSymbol.ETH_USDT,
        '1d',
        new Date('2023-11-14T00:00:00Z'),
        new Date('2024-01-01T00:00:00Z')
      );
      await jest.runAllTimersAsync();

      const totalRecords = await promise;

      expect(totalRecords).toBe(2);
      expect(fnFetch).toHaveBeenCalledTimes(9);
      expect(fnUpsert).toHaveBeenCalledTimes(1);
      expect(fnUpsert).toHaveBeenCalledWith([
        { symbol: 'ETH/USDT', createdAt: new Date(1700000000000), rate: 1.0 },
        { symbol: 'ETH/USDT', createdAt: new Date(1700086400000), rate: 1.1 }
      ]);
    });
  });

  describe(FxRateService.prototype.refreshTickerRates.name, () => {
    it('should refresh ticker rates', async () => {
      const fnFetch = jest.spyOn(fxClient, 'fetchTicker').mockResolvedValueOnce({
        symbol: FxSymbol.ETH_USDT,
        close: 1.5,
        timestamp: new Date('2024-01-01T00:00:00Z').getTime()
      } as Ticker);
      const fnUpsert = jest.spyOn(repository, 'upsert').mockResolvedValue();

      await service.refreshTickerRates(FxSymbol.ETH_USDT);

      expect(fnFetch).toHaveBeenCalledTimes(1);
      expect(fnUpsert).toHaveBeenCalledTimes(1);
      expect(fnUpsert).toHaveBeenCalledWith([
        { symbol: 'ETH/USDT', createdAt: new Date('2024-01-01T00:00:00Z'), rate: 1.5 }
      ]);
    });
  });

  describe(FxRateService.prototype.toDto.name, () => {
    it('should convert entity to DTO', () => {
      const entity = {
        id: 1,
        symbol: FxSymbol.ETH_USDT,
        rate: 2.0,
        createdAt: new Date('2023-12-31T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      };
      const dto = service.toDto(entity);
      expect(dto).toEqual({
        symbol: FxSymbol.ETH_USDT,
        rate: 2.0,
        createdAt: new Date('2023-12-31T00:00:00Z')
      });
      expect(dto).toBeInstanceOf(FxRateDto);
    });
  });
});
