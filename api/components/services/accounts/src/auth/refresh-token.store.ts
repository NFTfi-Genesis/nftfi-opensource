import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { RedisStore } from 'cache-manager-ioredis-yet';

const REFRESH_TOKEN_TTL_MS = 31 * 24 * 60 * 60 * 1000; // 31 days

export interface StoredRefreshToken {
  account: string;
  multisig?: { type?: string };
  token: string;
  createdMs: number;
  createdByIp: string;
}

@Injectable()
export class RefreshTokenStore {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache<RedisStore>) {}

  async save(data: StoredRefreshToken): Promise<void> {
    await this.cacheManager.set(this.tokenKey(data.token), data, REFRESH_TOKEN_TTL_MS);
  }

  async findActive(token: string): Promise<StoredRefreshToken | null> {
    return (await this.cacheManager.get<StoredRefreshToken>(this.tokenKey(token))) ?? null;
  }

  async revoke(token: string): Promise<void> {
    await this.cacheManager.del(this.tokenKey(token));
  }

  private tokenKey(token: string): string {
    return `accounts:refresh-token:${token}`;
  }
}
