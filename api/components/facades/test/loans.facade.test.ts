import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { of } from 'rxjs';
import { ClientRMQ } from '@nestjs/microservices';
import { QueueFacade, QueueFacadeConfigToken } from '@nftfi.api/facades/queue';
import { LoansFacade, LoansQueueTopic } from '../src/loans';

describe(LoansFacade.name, () => {
  let facade: LoansFacade;
  let client: ClientRMQ;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        LoansFacade,
        {
          provide: 'LoansFacadeToken',
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

    facade = moduleRef.get(LoansFacade);
    client = moduleRef.get('LoansFacadeToken');
  });

  describe(LoansFacade.prototype.invalidateCache.name, () => {
    it('emits invalidate-cache event to loans queue', async () => {
      const fnEmit = jest.spyOn(client, 'emit').mockReturnValueOnce(of(undefined));

      await facade.invalidateCache();

      expect(fnEmit).toHaveBeenCalledWith(LoansQueueTopic.InvalidateCache, { caller: 'test-caller' });
    });
  });

  describe(LoansFacade.forRoot.name, () => {
    it('returns a dynamic module with loans queue config', () => {
      const dynamicModule = LoansFacade.forRoot({
        configCallback: () => ({ urls: ['amqp://localtest:5672'] }),
        caller: 'test-caller'
      });

      expect(dynamicModule.module.name).toBe('LoansFacadeModule');
      expect(dynamicModule.global).toBe(true);
    });
  });

  describe(LoansFacade.setupMicroservice.name, () => {
    it('configures microservice setup for loans queue', () => {
      const app = {
        connectMicroservice: jest.fn()
      } as unknown as INestApplication;
      const fnSetup = jest.spyOn(QueueFacade, 'setupMicroservice').mockReturnValueOnce();

      LoansFacade.setupMicroservice(app, () => ({ urls: ['amqp://localtest:5672'] }));

      expect(fnSetup).toHaveBeenCalledWith(app, expect.any(Function), 'loans', {});
    });
  });
});
