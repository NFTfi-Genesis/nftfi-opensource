import { Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { RedisStore } from 'cache-manager-ioredis-yet';

export function Cache<T, A extends Array<unknown> = unknown[]>(
  keyBuilder: ((instance: T, ...args: A) => string) | string,
  msTTL: number
): MethodDecorator {
  const injectInCacheManager = Inject(CACHE_MANAGER);
  const logger = new Logger('CacheDecorator');

  return (target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) => {
    injectInCacheManager(target, 'cacheManager');

    const origin = descriptor.value;

    descriptor.value = async function (...args: A): Promise<unknown> {
      const key = typeof keyBuilder === 'function' ? keyBuilder(this, ...args) : keyBuilder;

      if (!this.cacheManager || !this.cacheManager.store) {
        logger.warn(`Cache manager not found for key "${key}", falling back to original method execution`);
        return await origin.apply(this, args);
      }

      const cacheManager = this.cacheManager.store as RedisStore;

      const cachedValue = await cacheManager.get(key);
      if (cachedValue) {
        return cachedValue;
      }

      const result = await origin.apply(this, args);
      await cacheManager.set(key, result, msTTL);
      return result;
    };

    return descriptor;
  };
}
