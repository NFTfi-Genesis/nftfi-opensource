import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FxRatesFacade } from '@nftfi.api/facades/fx-rates';
import { FxRateProviderService } from '../../src/fx-rate-provider/fx-rate-provider.service';
import { FxRateConfig, FxRateConfigToken } from '../../src/fx-rate-provider/fx-rate-provider.types';

describe(FxRateProviderService.name, () => {
  let service: FxRateProviderService;
  let fxRatesFacade: { getLatestRate: jest.Mock };
  let config: FxRateConfig;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => void 0);
  });

  beforeEach(async () => {
    jest.resetAllMocks();

    config = { ethusdt: 0 };

    const moduleRef = await Test.createTestingModule({
      providers: [
        FxRateProviderService,
        {
          provide: FxRatesFacade,
          useValue: {
            getLatestRate: jest.fn()
          }
        },
        {
          provide: FxRateConfigToken,
          useValue: config
        }
      ]
    }).compile();

    service = moduleRef.get(FxRateProviderService);
    fxRatesFacade = moduleRef.get(FxRatesFacade);
  });

  describe(FxRateProviderService.prototype.onApplicationBootstrap.name, () => {
    it('triggers fx rates update on bootstrap', () => {
      const fnUpdate = jest.spyOn(service, 'handleUpdateFxRates').mockResolvedValue();

      service.onApplicationBootstrap();

      expect(fnUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe(FxRateProviderService.prototype.handleUpdateFxRates.name, () => {
    it('loads latest ETH/USD rate, logs it and updates config', async () => {
      jest.spyOn(fxRatesFacade, 'getLatestRate').mockResolvedValue(3210.55);

      await service.handleUpdateFxRates();

      expect(fxRatesFacade.getLatestRate).toHaveBeenCalledTimes(1);
      expect(Logger.prototype.log).toHaveBeenCalledWith('Latest FX rate ETH/USD is 3210.55');
      expect(config.ethusdt).toBe(3210.55);
    });
  });
});
