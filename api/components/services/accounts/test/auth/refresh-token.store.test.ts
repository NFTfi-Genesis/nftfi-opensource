import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { RefreshTokenStore, type StoredRefreshToken } from '../../src/auth/refresh-token.store';

describe(RefreshTokenStore.name, () => {
  let store: RefreshTokenStore;
  let cacheManager: { set: jest.Mock; get: jest.Mock; del: jest.Mock };
  const testDate = new Date('2024-01-01T00:00:00.000Z');

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(testDate);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    cacheManager = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenStore,
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager
        }
      ]
    }).compile();

    store = module.get<RefreshTokenStore>(RefreshTokenStore);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe(RefreshTokenStore.prototype.save.name, () => {
    const storedToken: StoredRefreshToken = {
      account: '0x1234567890123456789012345678901234567890',
      token: 'abc123refreshtoken',
      createdMs: testDate.getTime(),
      createdByIp: '192.168.1.1'
    };

    it('should save token to cache with correct key', async () => {
      cacheManager.set.mockResolvedValue(undefined);

      await store.save(storedToken);

      expect(cacheManager.set).toHaveBeenCalledWith(
        'accounts:refresh-token:abc123refreshtoken',
        storedToken,
        expect.any(Number)
      );
    });

    it('should save token with 31-day TTL in milliseconds', async () => {
      cacheManager.set.mockResolvedValue(undefined);

      await store.save(storedToken);

      expect(cacheManager.set).toHaveBeenCalledWith(expect.any(String), expect.any(Object), 2678400000);
    });

    it('should include multisig in saved data when provided', async () => {
      const tokenWithMultisig: StoredRefreshToken = {
        ...storedToken,
        multisig: { type: 'gnosis' }
      };
      cacheManager.set.mockResolvedValue(undefined);

      await store.save(tokenWithMultisig);

      expect(cacheManager.set).toHaveBeenCalledWith(
        'accounts:refresh-token:abc123refreshtoken',
        tokenWithMultisig,
        2678400000
      );
    });

    it('should use token value as part of the cache key', async () => {
      const tokenWithDifferentValue: StoredRefreshToken = {
        ...storedToken,
        token: 'differenttoken456'
      };
      cacheManager.set.mockResolvedValue(undefined);

      await store.save(tokenWithDifferentValue);

      expect(cacheManager.set).toHaveBeenCalledWith(
        'accounts:refresh-token:differenttoken456',
        tokenWithDifferentValue,
        2678400000
      );
    });
  });

  describe(RefreshTokenStore.prototype.findActive.name, () => {
    const storedToken: StoredRefreshToken = {
      account: '0x1234567890123456789012345678901234567890',
      token: 'abc123refreshtoken',
      createdMs: testDate.getTime(),
      createdByIp: '192.168.1.1'
    };

    it('should return stored token when found in cache', async () => {
      cacheManager.get.mockResolvedValue(storedToken);

      const result = await store.findActive('abc123refreshtoken');

      expect(result).toEqual(storedToken);
      expect(cacheManager.get).toHaveBeenCalledWith('accounts:refresh-token:abc123refreshtoken');
    });

    it('should return null when token is not found in cache', async () => {
      cacheManager.get.mockResolvedValue(null);

      const result = await store.findActive('nonexistenttoken');

      expect(result).toBeNull();
    });

    it('should return null when cache returns undefined', async () => {
      cacheManager.get.mockResolvedValue(undefined);

      const result = await store.findActive('anytoken');

      expect(result).toBeNull();
    });

    it('should look up cache using correct key prefix', async () => {
      cacheManager.get.mockResolvedValue(storedToken);

      await store.findActive('mytoken');

      expect(cacheManager.get).toHaveBeenCalledWith('accounts:refresh-token:mytoken');
    });

    it('should return stored token with multisig when present', async () => {
      const tokenWithMultisig: StoredRefreshToken = {
        ...storedToken,
        multisig: { type: 'gnosis' }
      };
      cacheManager.get.mockResolvedValue(tokenWithMultisig);

      const result = await store.findActive('abc123refreshtoken');

      expect(result).toEqual({
        account: '0x1234567890123456789012345678901234567890',
        token: 'abc123refreshtoken',
        createdMs: testDate.getTime(),
        createdByIp: '192.168.1.1',
        multisig: { type: 'gnosis' }
      });
    });
  });

  describe(RefreshTokenStore.prototype.revoke.name, () => {
    it('should delete token from cache using correct key', async () => {
      cacheManager.del.mockResolvedValue(undefined);

      await store.revoke('abc123refreshtoken');

      expect(cacheManager.del).toHaveBeenCalledWith('accounts:refresh-token:abc123refreshtoken');
    });

    it('should delete using correct key for any token value', async () => {
      cacheManager.del.mockResolvedValue(undefined);

      await store.revoke('someothertoken789');

      expect(cacheManager.del).toHaveBeenCalledWith('accounts:refresh-token:someothertoken789');
    });

    it('should not throw when token does not exist in cache', async () => {
      cacheManager.del.mockResolvedValue(undefined);

      await expect(store.revoke('nonexistenttoken')).resolves.toBeUndefined();
    });
  });
});
