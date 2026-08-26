import { AxiosStorage, StorageValue, buildStorage, canStale } from 'axios-cache-interceptor';
import { RedisStore } from 'cache-manager-ioredis-yet';

interface AxiosRedisStorageOptions {
  keyPrefix: string;
}

export const buildAxiosRedisStorage = (cache: RedisStore, { keyPrefix }: AxiosRedisStorageOptions): AxiosStorage => {
  const buildKey = (key: string): string => `${keyPrefix}:${key}`;

  // https://github.com/arthurfiorette/axios-cache-interceptor/blob/main/docs/src/guide/storages.md#node-redis-storage
  return buildStorage({
    set: async (key: string, value: StorageValue, req): Promise<void> => {
      let PXAT: number | undefined;
      if (value.state === 'loading') {
        PXAT = Date.now() + (req?.cache && typeof req.cache.ttl === 'number' ? req.cache.ttl : 60000);
      } else if (value.state === 'stale' && value.ttl) {
        PXAT = value.createdAt + value.ttl;
      } else if (value.state === 'cached' && !canStale(value)) {
        PXAT = value.createdAt + value.ttl;
      }

      await cache.set(buildKey(key), JSON.stringify(value), PXAT - Date.now());
    },

    find: async (key: string): Promise<StorageValue> => {
      const value: string = await cache.get(buildKey(key));
      if (value) {
        return JSON.parse(value);
      }
    },

    remove: async (key: string): Promise<void> => {
      await cache.del(buildKey(key));
    }
  });
};
