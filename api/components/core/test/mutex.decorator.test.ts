import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Injectable, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as RedisSemaphore from 'redis-semaphore';
import { HealthService } from '@nftfi.api/modules/health';
import { Mutex, MutexParams } from '../src/decorators/mutex.decorator';

interface ITestService {
  method(callback: jest.Func): Promise<void>;
}

interface ModuleOptions extends MutexParams {}

describe(Mutex.name, () => {
  const buildTestingModule = async (options: ModuleOptions = {}): Promise<ITestService> => {
    @Injectable()
    class TestService implements ITestService {
      @Mutex({ msLockTimeout: options.msLockTimeout, strategy: options.strategy, key: options.key })
      async method(callback: jest.Func): Promise<void> {
        callback();
      }
    }

    const moduleRef = await Test.createTestingModule({
      providers: [
        TestService,
        { provide: HealthService, useValue: { on: jest.fn(), off: jest.fn() } },
        { provide: CACHE_MANAGER, useValue: { store: { client: jest.fn() } } }
      ]
    }).compile();

    return moduleRef.get(TestService);
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  it('returns a method decorator', () => {
    const decorator = Mutex();
    expect(decorator).toBeInstanceOf(Function);
  });

  it('acquires a lock and calls method', async () => {
    jest.spyOn(RedisSemaphore.Mutex.prototype, 'tryAcquire').mockResolvedValue(true);
    jest.spyOn(RedisSemaphore.Mutex.prototype, 'isAcquired', 'get').mockReturnValue(true);
    jest.spyOn(RedisSemaphore.Mutex.prototype, 'release').mockResolvedValue();
    const fn = jest.fn();

    const service = await buildTestingModule();
    await service.method(fn);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(RedisSemaphore.Mutex.prototype.release).toHaveBeenCalled();
  });

  it('uses nowait strategy and does not call method if lock is not acquired', async () => {
    jest.spyOn(RedisSemaphore.Mutex.prototype, 'tryAcquire').mockResolvedValue(false);
    jest.spyOn(RedisSemaphore.Mutex.prototype, 'isAcquired', 'get').mockReturnValue(false);
    jest.spyOn(RedisSemaphore.Mutex.prototype, 'release').mockResolvedValue();
    const fn = jest.fn();

    const service = await buildTestingModule({ strategy: 'nowait' });
    await service.method(fn);

    expect(fn).not.toHaveBeenCalled();
    expect(RedisSemaphore.Mutex.prototype.release).not.toHaveBeenCalled();
  });

  it('uses wait strategy to acquire lock', async () => {
    jest.spyOn(RedisSemaphore.Mutex.prototype, 'tryAcquire').mockResolvedValueOnce(false).mockResolvedValue(true);
    jest.spyOn(RedisSemaphore.Mutex.prototype, 'isAcquired', 'get').mockReturnValue(true);
    const fnRelease = jest.spyOn(RedisSemaphore.Mutex.prototype, 'release').mockResolvedValue();
    const fn = jest.fn();

    const service = await buildTestingModule({ strategy: 'wait' });
    await service.method(fn);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fnRelease).toHaveBeenCalled();
  });

  it('catches errors and releases lock', async () => {
    jest.spyOn(RedisSemaphore.Mutex.prototype, 'tryAcquire').mockRejectedValue(true);
    jest.spyOn(RedisSemaphore.Mutex.prototype, 'isAcquired', 'get').mockReturnValue(true);
    jest.spyOn(RedisSemaphore.Mutex.prototype, 'release').mockResolvedValue();
    const fnLog = jest.spyOn(Logger.prototype, 'error').mockImplementation(jest.fn());
    const fn = jest.fn().mockRejectedValue(new Error('test'));

    const service = await buildTestingModule({ msLockTimeout: null });
    const promise = service.method(fn);

    await expect(promise).resolves.toBeUndefined();
    expect(fn).not.toHaveBeenCalled();
    expect(RedisSemaphore.Mutex.prototype.release).toHaveBeenCalled();
    expect(fnLog).toHaveBeenCalled();
  });

  it('sets lock timeout to 5 minutes by default', async () => {
    const constructorSpy = jest.spyOn(RedisSemaphore, 'Mutex').mockImplementation(jest.fn());
    const service = await buildTestingModule({ msLockTimeout: 111 });
    await service.method(jest.fn());

    expect(constructorSpy).toHaveBeenCalledWith(expect.any(Function), 'TestService:method:[null]', {
      lockTimeout: 111
    });
  });

  it('allows setting custom key generator function', async () => {
    const constructorSpy = jest.spyOn(RedisSemaphore, 'Mutex').mockImplementation(
      jest.fn().mockReturnValue({
        tryAcquire: jest.fn().mockResolvedValue(true),
        release: jest.fn().mockResolvedValue(true),
        get isAcquired() {
          return true;
        }
      })
    );
    const service = await buildTestingModule({ key: (): string => 'generated-key' });
    await service.method(jest.fn());

    expect(constructorSpy).toHaveBeenCalledWith(expect.any(Function), 'generated-key', {
      lockTimeout: 300000
    });
  });

  it('allows setting custom string key', async () => {
    const constructorSpy = jest.spyOn(RedisSemaphore, 'Mutex').mockImplementation(jest.fn());
    const service = await buildTestingModule({ key: 'custom-key' });
    await service.method(jest.fn());

    expect(constructorSpy).toHaveBeenCalledWith(expect.any(Function), 'custom-key', {
      lockTimeout: 300000
    });
  });
});
