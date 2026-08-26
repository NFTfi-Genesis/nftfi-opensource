import { RedisStore } from 'cache-manager-ioredis-yet';
import { buildAxiosRedisStorage } from '../src/axios-redis-storage';

jest.mock('ioredis');

describe('axios-redis-storage', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();

    jest.spyOn(Date, 'now').mockReturnValue(111);
    jest.spyOn(console, 'log').mockImplementation(jest.fn());
  });

  describe('set', () => {
    it('should call redis set', async () => {
      const cacheClient = { set: jest.fn(), get: jest.fn(), del: jest.fn() } as unknown as RedisStore;

      const storage = buildAxiosRedisStorage(cacheClient, { keyPrefix: 'test' });
      await storage.set('key', {
        state: 'cached',
        ttl: 1,
        createdAt: 111,
        data: { headers: {}, status: 1, statusText: 'test', data: 'data' }
      });
      expect(cacheClient.set).toHaveBeenCalledWith(
        'test:key',
        '{"state":"cached","ttl":1,"createdAt":111,"data":{"headers":{},"status":1,"statusText":"test","data":"data"}}',
        1
      );
    });

    it('should call redis set with default ttl', async () => {
      const cacheClient = { set: jest.fn(), get: jest.fn(), del: jest.fn() } as unknown as RedisStore;

      const storage = buildAxiosRedisStorage(cacheClient, { keyPrefix: 'test' });
      await storage.set('key', {
        state: 'loading',
        createdAt: 111,
        previous: null,
        data: { headers: {}, status: 1, statusText: 'test', data: 'data' }
      });
      expect(cacheClient.set).toHaveBeenCalledWith(
        'test:key',
        '{"state":"loading","createdAt":111,"previous":null,"data":{"headers":{},"status":1,"statusText":"test","data":"data"}}',
        60000
      );
    });

    it('should call redis set with custom ttl', async () => {
      const cacheClient = { set: jest.fn(), get: jest.fn(), del: jest.fn() } as unknown as RedisStore;

      const storage = buildAxiosRedisStorage(cacheClient, { keyPrefix: 'test' });
      await storage.set(
        'key',
        {
          state: 'loading',
          createdAt: 111,
          previous: null,
          data: { headers: {}, status: 1, statusText: 'test', data: 'data' }
        },
        { cache: { ttl: 1000 } }
      );
      expect(cacheClient.set).toHaveBeenCalledWith(
        'test:key',
        '{"state":"loading","createdAt":111,"previous":null,"data":{"headers":{},"status":1,"statusText":"test","data":"data"}}',
        1000
      );
    });

    it('should call redis set with stale ttl', async () => {
      const cacheClient = { set: jest.fn(), get: jest.fn(), del: jest.fn() } as unknown as RedisStore;

      const storage = buildAxiosRedisStorage(cacheClient, { keyPrefix: 'test' });
      await storage.set(
        'key',
        {
          state: 'stale',
          createdAt: 111,
          ttl: 1000,
          data: { headers: {}, status: 1, statusText: 'test', data: 'data' }
        },
        { cache: { ttl: 1000 } }
      );
      expect(cacheClient.set).toHaveBeenCalledWith(
        'test:key',
        '{"state":"stale","createdAt":111,"ttl":1000,"data":{"headers":{},"status":1,"statusText":"test","data":"data"}}',
        1000
      );
    });
  });

  describe('get', () => {
    it('should call redis get', async () => {
      const cacheClient = {
        set: jest.fn(),
        get: jest
          .fn()
          .mockResolvedValue(
            '{"state":"cached","ttl":1,"createdAt":111,"data":{"headers":{},"status":1,"statusText":"test","data":"data"}}'
          ),
        del: jest.fn()
      } as unknown as RedisStore;

      const storage = buildAxiosRedisStorage(cacheClient, { keyPrefix: 'test' });
      const result = await storage.get('key');
      expect(result).toEqual({
        state: 'cached',
        ttl: 1,
        createdAt: 111,
        data: { headers: {}, status: 1, statusText: 'test', data: 'data' }
      });
    });
  });

  describe('remove', () => {
    it('should call redis del', async () => {
      const cacheClient = { set: jest.fn(), get: jest.fn(), del: jest.fn() } as unknown as RedisStore;

      const storage = buildAxiosRedisStorage(cacheClient, { keyPrefix: 'test' });
      await storage.remove('key');
      expect(cacheClient.del).toHaveBeenCalledWith('test:key');
    });
  });
});
