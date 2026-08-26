import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { Logger, Provider } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as RedisSemaphore from 'redis-semaphore';
import { ContractSubscriber } from '../../src/ethers-observer/contract-subscriber.service';
import { ContractExplorerService } from '../../src/ethers-observer/contract-explorer.service';
import { buildContract, buildRegisteredHandler } from './factories';

jest.mock('redis-semaphore');
jest.mock('@ethersproject/contracts', () => ({
  Contract: class {}
}));

describe(ContractSubscriber.name, () => {
  let service: ContractSubscriber;
  let contractExplorerService: ContractExplorerService;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(jest.fn());
    jest.spyOn(Logger.prototype, 'error').mockImplementation(jest.fn());
  });

  const buildModule = async (providers: Provider[] = []): Promise<void> => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            (): object => ({
              ethereum: {
                replay: {
                  chunkSize: 10
                }
              }
            })
          ]
        })
      ],
      providers: [
        ContractSubscriber,
        {
          provide: ContractExplorerService,
          useValue: {
            getRegisteredHandlers: jest.fn().mockReturnValue([]),
            callHandler: jest.fn()
          } as Partial<ContractExplorerService>
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            store: {
              client: {
                set: jest.fn(),
                get: jest.fn()
              }
            }
          }
        },
        ...providers
      ]
    }).compile();

    service = moduleRef.get(ContractSubscriber);
    contractExplorerService = moduleRef.get(ContractExplorerService);

    jest.spyOn(RedisSemaphore.Mutex.prototype, 'tryAcquire').mockResolvedValue(true);
    jest.spyOn(RedisSemaphore.Mutex.prototype, 'release').mockResolvedValue();
  };

  describe(ContractSubscriber.prototype.onModuleInit, () => {
    it('adds listener for each registered handler', async () => {
      await buildModule();
      const handler = buildRegisteredHandler({
        contract: Object.assign(buildContract({ metadata: { replay: { enabled: true, startAt: 0 } } }), {
          replayed: true
        })
      });
      jest.spyOn(contractExplorerService, 'getRegisteredHandlers').mockReturnValue([handler]);

      const promise = service.onModuleInit();
      await expect(promise).resolves.toBeUndefined();

      expect((handler.contract.on as jest.Mock).mock.calls).toEqual(
        expect.arrayContaining([expect.arrayContaining(['Transfer', expect.any(Function)])])
      );
    });

    it('throws error if cache module not injected', async () => {
      await buildModule([{ provide: CACHE_MANAGER, useValue: undefined }]);

      const promise = service.onModuleInit();
      await expect(promise).rejects.toThrow('Cache manager must be configured with a RedisStore');
    });
  });

  describe(ContractSubscriber.prototype.onModuleDestroy, () => {
    it('removes listener for each registered handler', async () => {
      await buildModule();
      const handler = buildRegisteredHandler();
      jest.spyOn(contractExplorerService, 'getRegisteredHandlers').mockReturnValue([handler]);
      const fnUnsubscribe = jest.spyOn(service, 'unsubscribe');

      const promise = service.onModuleInit();
      await expect(promise).resolves.toBeUndefined();

      service.onModuleDestroy();

      expect(fnUnsubscribe).toHaveBeenCalledWith(handler);
    });
  });

  describe(ContractSubscriber.prototype.unsubscribe, () => {
    it('removes listener from contract', async () => {
      await buildModule();
      const fnUnsubscribe = jest.fn();
      const handler = buildRegisteredHandler({
        contract: buildContract({ removeAllListeners: fnUnsubscribe, listenerCount: jest.fn().mockReturnValue(1) })
      });
      jest.spyOn(contractExplorerService, 'getRegisteredHandlers').mockReturnValue([handler]);

      const promise = service.onModuleInit();
      await expect(promise).resolves.toBeUndefined();

      await service.unsubscribe(handler);

      expect(fnUnsubscribe).toHaveBeenCalledWith('Transfer');
    });

    it('does nothing if listener is not registered', async () => {
      await buildModule();
      const fnUnsubscribe = jest.fn().mockImplementation(() => {
        throw new Error('test');
      });
      const handler = buildRegisteredHandler({
        contract: buildContract({ removeAllListeners: fnUnsubscribe, listenerCount: jest.fn().mockReturnValue(1) })
      });
      jest.spyOn(contractExplorerService, 'getRegisteredHandlers').mockReturnValue([handler]);

      const promise = service.onModuleInit();
      await expect(promise).resolves.toBeUndefined();

      await service.unsubscribe(handler);

      expect(fnUnsubscribe).toHaveBeenCalledWith('Transfer');
    });

    it('does not release mutex if not acquired', async () => {
      await buildModule();
      const fnUnsubscribe = jest.fn();
      const fnMutexRelease = jest.fn();
      const handler = buildRegisteredHandler({
        contract: buildContract({ removeAllListeners: fnUnsubscribe, listenerCount: jest.fn().mockReturnValue(1) })
      });
      jest.spyOn(contractExplorerService, 'getRegisteredHandlers').mockReturnValue([handler]);
      jest.spyOn(RedisSemaphore, 'Mutex').mockReturnValue({
        tryAcquire: jest.fn().mockResolvedValue(false),
        release: fnMutexRelease,
        isAcquired: true
      } as unknown as RedisSemaphore.Mutex);

      const promise = service.onModuleInit();
      await expect(promise).resolves.toBeUndefined();

      await service.unsubscribe(handler);

      expect(fnUnsubscribe).toHaveBeenCalled();
      expect(fnMutexRelease).toHaveBeenCalled();
    });
  });

  describe(ContractSubscriber.prototype.subscribe, () => {
    it('does nothing if mutex is not acquired', async () => {
      await buildModule();
      const fnOn = jest.fn();
      const handler = buildRegisteredHandler({
        contract: Object.assign(
          buildContract({ on: fnOn as never, listenerCount: jest.fn().mockReturnValue(0) } as never),
          { replayed: true }
        )
      });
      jest.spyOn(contractExplorerService, 'getRegisteredHandlers').mockReturnValue([handler]);
      jest.spyOn(RedisSemaphore.Mutex.prototype, 'tryAcquire').mockResolvedValue(false);

      const promise = service.onModuleInit();
      await expect(promise).resolves.toBeUndefined();

      await service.subscribe(handler);

      expect(fnOn).not.toHaveBeenCalled();
      expect(RedisSemaphore.Mutex.prototype.tryAcquire).toHaveBeenCalled();
      expect(RedisSemaphore.Mutex.prototype.release).not.toHaveBeenCalled();
    });
  });

  describe(ContractSubscriber.prototype['getMutexClient'].name, () => {
    it('returns a mutex client', async () => {
      await buildModule();
      const handler = buildRegisteredHandler();
      const mutex = service['getMutexClient'](handler);

      expect(mutex).toBeInstanceOf(RedisSemaphore.Mutex);
    });

    it('unsubscribes if lock is lost', async () => {
      await buildModule();
      const handler = buildRegisteredHandler();
      const fnUnsubscribe = jest.spyOn(service, 'unsubscribe').mockImplementation(jest.fn());
      const fnMutex = jest.spyOn(RedisSemaphore, 'Mutex');

      service['getMutexClient'](handler);
      (fnMutex.mock.calls[0][2].onLockLost as () => void)();

      expect(fnUnsubscribe).toHaveBeenCalledWith(handler);
    });
  });

  it('calls original handler when event is fired', async () => {
    await buildModule();
    const fnCallHandler = jest.spyOn(contractExplorerService, 'callHandler').mockImplementation(jest.fn());
    const contract = buildContract({ interface: { getEvent: jest.fn().mockReturnValue({ inputs: [] }) } });
    const handler = buildRegisteredHandler({
      contract: Object.assign(contract, { metadata: { replay: { enabled: true, startAt: 0 } }, replayed: true })
    });
    jest.spyOn(contractExplorerService, 'getRegisteredHandlers').mockReturnValue([handler]);

    const promise = service.onModuleInit();
    await expect(promise).resolves.toBeUndefined();

    (contract.on as jest.Mock).mock.calls[0][1]({ blockNumber: 1, args: {}, topics: ['0x0'] });

    expect(fnCallHandler).toHaveBeenCalledWith(
      handler.handler,
      { '@test': { index: 0, data: 'test' } },
      handler.contract,
      { blockNumber: 1, args: {}, topics: ['0x0'] }
    );
  });

  it('logs error when subscribing fails', async () => {
    await buildModule();
    const handler = buildRegisteredHandler({
      contract: Object.assign(buildContract({ metadata: { replay: { enabled: true, startAt: 0 } } }), {
        replayed: true
      })
    });
    handler.contract.on = jest.fn().mockImplementation(() => {
      throw new Error('test');
    });
    jest.spyOn(contractExplorerService, 'getRegisteredHandlers').mockReturnValue([handler]);

    const promise = service.onModuleInit();
    await expect(promise).resolves.toBeUndefined();

    expect(Logger.prototype.error).toHaveBeenCalledWith(expect.stringContaining('test'));
  });
});
