import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { of } from 'rxjs';
import { ClientRMQ } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueFacade, QueueFacadeConfigToken } from '@nftfi.api/facades/queue';
import { FxRatesFacade, FxSymbol } from '../src/fx-rates';

describe(FxRatesFacade.name, () => {
  let facade: FxRatesFacade;
  let client: ClientRMQ;
  let configService: ConfigService;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => void 0);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => void 0);
  });

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            (): object => ({
              rabbitmq: {
                url: 'amqp://localtest:5672'
              }
            })
          ]
        })
      ],
      providers: [
        FxRatesFacade,
        {
          provide: 'FxRatesFacadeToken',
          useValue: {
            emit: jest.fn(),
            send: jest.fn()
          }
        },
        {
          provide: QueueFacadeConfigToken,
          useValue: {
            urls: ['amqp://localtest:5672'],
            caller: 'test-caller'
          }
        }
      ]
    }).compile();

    facade = moduleRef.get(FxRatesFacade);
    client = moduleRef.get('FxRatesFacadeToken');
    configService = moduleRef.get(ConfigService);
  });

  it('should load rabbitmq config for tests', () => {
    const rabbitmqConfig = configService.get('rabbitmq');

    expect(rabbitmqConfig).toEqual({ url: 'amqp://localtest:5672' });
  });

  describe(FxRatesFacade.forRoot.name, () => {
    it('should return a dynamic module with correct configuration', () => {
      const dynamicModule = FxRatesFacade.forRoot({
        configCallback: () => ({ urls: ['amqp://localtest:5672'] }),
        caller: 'test-caller'
      });
      expect(dynamicModule.module.name).toBe('FxRatesFacadeModule');
      expect(dynamicModule.global).toBe(true);
    });
  });

  describe(FxRatesFacade.setupMicroservice.name, () => {
    it('should setup microservice with correct configuration', () => {
      const app = {
        connectMicroservice: jest.fn()
      } as unknown as INestApplication;
      const fnSetup = jest.spyOn(QueueFacade, 'setupMicroservice').mockReturnValueOnce();

      FxRatesFacade.setupMicroservice(app, () => ({ urls: ['amqp://localtest:5672'] }));

      expect(fnSetup.mock.calls[0][1](configService)).toEqual({ urls: ['amqp://localtest:5672'] });
      expect(fnSetup).toHaveBeenCalledWith(app, expect.any(Function), 'fx-rates', {});
    });
  });

  describe(FxRatesFacade.prototype.getLatestRate.name, () => {
    it('should handle loan sync', async () => {
      const fnEmit = jest.spyOn(client, 'send').mockReturnValueOnce(of({ data: { rate: 1850.5 } }));

      const result = await facade.getLatestRate();

      expect(result).toEqual(1850.5);
      expect(fnEmit).toHaveBeenCalledWith('fx-rates_get-latest', {
        symbol: FxSymbol.ETH_USDT,
        caller: 'test-caller'
      });
    });

    it('should return 0 if no rate is found', async () => {
      jest.spyOn(client, 'send').mockReturnValueOnce(of({ data: null }));

      const result = await facade.getLatestRate();

      expect(result).toEqual(0);
    });
  });

  describe(FxRatesFacade.prototype.getRateAtDate.name, () => {
    it('should return rate for the provided date', async () => {
      const date = new Date('2024-01-10T00:00:00.000Z');
      const fnEmit = jest.spyOn(client, 'send').mockReturnValueOnce(of({ data: { rate: 1600.25 } }));

      const result = await facade.getRateAtDate(date);

      expect(result).toEqual(1600.25);
      expect(fnEmit).toHaveBeenCalledWith('fx-rates_get-at-date', {
        symbol: FxSymbol.ETH_USDT,
        date,
        caller: 'test-caller'
      });
    });

    it('should return 0 if no rate is found', async () => {
      const date = new Date('2024-01-10T00:00:00.000Z');
      jest.spyOn(client, 'send').mockReturnValueOnce(of({ data: null }));

      const result = await facade.getRateAtDate(date);

      expect(result).toEqual(0);
    });
  });
});
