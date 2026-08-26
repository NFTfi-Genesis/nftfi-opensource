import { Test } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { FxSymbol } from '@nftfi.api/facades/fx-rates';
import { buildPostgresFxRate } from '@nftfi.api/repositories/postgres/factories/fx-rate';
import { FxRateController } from '../src/fx-rate/fx-rate.controller';
import { FxRateService } from '../src/fx-rate/fx-rate.service';

jest.mock('redis-semaphore');

describe(FxRateController.name, () => {
  let controller: FxRateController;
  let service: FxRateService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [FxRateController],
      providers: [
        {
          provide: FxRateService,
          useValue: {
            getLatest: jest.fn(),
            getAtDate: jest.fn(),
            toDto: jest.fn(v => v)
          }
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn()
          }
        }
      ]
    }).compile();

    controller = moduleRef.get(FxRateController);
    service = moduleRef.get(FxRateService);
  });

  describe(FxRateController.prototype.handleGetEthUsd.name, () => {
    it('should return the most recent fx-rate entry', async () => {
      jest.spyOn(service, 'getLatest').mockResolvedValue(
        buildPostgresFxRate({
          symbol: FxSymbol.ETH_USDT,
          rate: 1850.5,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-02T00:00:00Z')
        })
      );

      const result = await controller.handleGetEthUsd();

      expect(result).toEqual({
        result: {
          id: 1,
          symbol: FxSymbol.ETH_USDT,
          rate: 1850.5,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-02T00:00:00Z')
        }
      });
    });

    it('should return null if no fx-rate entry exists', async () => {
      jest.spyOn(service, 'getLatest').mockResolvedValue(null);

      const result = await controller.handleGetEthUsd();

      expect(result).toEqual({ result: null });
    });
  });

  describe(FxRateController.prototype.handleGetLatest.name, () => {
    it('should return the most recent fx-rate entry for the given symbol', async () => {
      jest.spyOn(service, 'getLatest').mockResolvedValue(
        buildPostgresFxRate({
          symbol: FxSymbol.ETH_USDT,
          rate: 1850.5,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-02T00:00:00Z')
        })
      );

      const result = await controller.handleGetLatest({ symbol: FxSymbol.ETH_USDT });

      expect(result).toEqual({
        data: {
          id: 1,
          symbol: FxSymbol.ETH_USDT,
          rate: 1850.5,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-02T00:00:00Z')
        }
      });
    });

    it('should return null if no fx-rate entry exists for the given symbol', async () => {
      jest.spyOn(service, 'getLatest').mockResolvedValue(null);

      const result = await controller.handleGetLatest({ symbol: FxSymbol.ETH_USDT });

      expect(result).toEqual({ data: null });
    });
  });

  describe(FxRateController.prototype.handleGetAtDate.name, () => {
    it('should return the most recent fx-rate entry for the given symbol and date', async () => {
      jest.spyOn(service, 'getAtDate').mockResolvedValue(
        buildPostgresFxRate({
          symbol: FxSymbol.ETH_USDT,
          rate: 1700.25,
          createdAt: new Date('2024-01-10T00:00:00Z'),
          updatedAt: new Date('2024-01-10T01:00:00Z')
        })
      );

      const result = await controller.handleGetAtDate({
        symbol: FxSymbol.ETH_USDT,
        date: new Date('2024-01-10T00:00:00Z')
      });

      expect(service.getAtDate).toHaveBeenCalledWith(FxSymbol.ETH_USDT, new Date('2024-01-10T00:00:00Z'));
      expect(result).toEqual({
        data: {
          id: 1,
          symbol: FxSymbol.ETH_USDT,
          rate: 1700.25,
          createdAt: new Date('2024-01-10T00:00:00Z'),
          updatedAt: new Date('2024-01-10T01:00:00Z')
        }
      });
    });

    it('should return null if no fx-rate entry exists for the given symbol and date', async () => {
      jest.spyOn(service, 'getAtDate').mockResolvedValue(null);

      const result = await controller.handleGetAtDate({
        symbol: FxSymbol.ETH_USDT,
        date: new Date('2024-01-10T00:00:00Z')
      });

      expect(result).toEqual({ data: null });
    });
  });
});
