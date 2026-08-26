import { Cache } from 'cache-manager';
import { RedisStore } from 'cache-manager-ioredis-yet';

export async function invalidateCacheByScope(cacheManager: Cache<RedisStore>, scope: string): Promise<void> {
  const store = cacheManager.store;
  const client = store.client;
  const keys = await client.keys(`${scope}:*`);
  if (!keys.length) {
    return;
  }
  const batchSize = 100;
  for (let i = 0; i < keys.length; i += batchSize) {
    const batch = keys.slice(i, i + batchSize);
    await client.del(...batch);
  }
}
