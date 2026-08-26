import { isFunction, isString } from 'lodash';
import { Inject, Logger } from '@nestjs/common';
import { Mutex as SemaphoreMutex } from 'redis-semaphore';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { RedisStore } from 'cache-manager-ioredis-yet';
import { HealthService, HealthStatus } from '@nftfi.api/modules/health';

const LOCK_5_MINS = 60 * 5 * 1000;

export interface MutexParams {
  msLockTimeout?: number;
  key?: string | ((...args: unknown[]) => string);
  strategy?: 'wait' | 'nowait';
}

export function Mutex(params: MutexParams = { strategy: 'nowait' }): MethodDecorator {
  const injectInCacheManager = Inject(CACHE_MANAGER);
  const injectInHealthService = Inject(HealthService);

  return (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => {
    injectInCacheManager(target, 'cacheManager');
    injectInHealthService(target, 'healthService');

    const origin = descriptor.value;
    const logger = new Logger(target.constructor.name);

    if (!params.strategy) {
      params.strategy = 'nowait';
    }
    if (!params.msLockTimeout) {
      params.msLockTimeout = LOCK_5_MINS;
    }

    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      const cacheManager = this.cacheManager.store as RedisStore;
      const healthService = this.healthService as HealthService;

      let key: string;
      switch (true) {
        case isFunction(params.key):
          key = params.key(...args);
          break;
        case isString(params.key):
          key = params.key;
          break;
        default:
          key = `${this.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;
      }

      const mutex = new SemaphoreMutex(cacheManager.client, key, {
        lockTimeout: params.msLockTimeout
      });

      const off = async (): Promise<void> => {
        if (mutex.isAcquired) {
          await mutex.release();
        }
      };

      healthService.on(HealthStatus.Shutdown, off);

      try {
        if (params.strategy === 'nowait' && !(await mutex.tryAcquire())) {
          return;
        }

        if (params.strategy === 'wait') {
          while (!(await mutex.tryAcquire())) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        const result = await origin.apply(this, args);

        setImmediate(() => {
          off();
          healthService.off(HealthStatus.Shutdown, off);
        });

        return result;
      } catch (e) {
        logger.error(e.message, e.stack);
      } finally {
        off();
        healthService.off(HealthStatus.Shutdown, off);
      }
    };

    return descriptor;
  };
}
