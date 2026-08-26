import { CACHE_KEY_METADATA, CACHE_TTL_METADATA, CacheInterceptor } from '@nestjs/cache-manager';
import { CallHandler, ExecutionContext, Injectable, Logger, StreamableFile } from '@nestjs/common';
import { isNil } from 'lodash';
import * as express from 'express';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { getDecodedAuthTokenFromRequest } from '@nftfi.api/modules/auth-guard';
import { HttpResponseHeader } from '../dtos/http-response';
import { serializeContext } from '../utils/cache-key-serialize';

const CACHED_HEADER_NAMES: readonly string[] = Object.values(HttpResponseHeader);
const ENVELOPE_MARKER = '__httpCacheEnvelope';

interface HttpCacheEnvelope<T> {
  [ENVELOPE_MARKER]: true;
  body: T;
  headers: Record<string, string>;
}

type TtlValue = number;
type TtlFactory = (context: ExecutionContext) => TtlValue | Promise<TtlValue>;
type TtlMetadata = TtlValue | TtlFactory | null;

function isEnvelope(value: unknown): value is HttpCacheEnvelope<unknown> {
  return typeof value === 'object' && value !== null && (value as Record<string, unknown>)[ENVELOPE_MARKER] === true;
}

@Injectable()
export class HttpCacheInterceptor extends CacheInterceptor {
  private readonly logger = new Logger(HttpCacheInterceptor.name);

  trackBy(context: ExecutionContext): string | undefined {
    if (context.getType() !== 'http') {
      return;
    }

    if (!this.isRequestCacheable(context)) {
      return;
    }

    const httpAdapter = this.httpAdapterHost?.httpAdapter;
    if (!httpAdapter?.getRequestUrl) {
      return;
    }

    const request = context.getArgByIndex<express.Request>(0);
    if (!request) {
      return;
    }

    const classPrefix = this.reflector.get<string>(CACHE_KEY_METADATA, context.getClass()) ?? '';
    const handlerPrefix = this.reflector.get<string>(CACHE_KEY_METADATA, context.getHandler()) ?? '';

    const prefix = `${classPrefix}:http:${handlerPrefix}`;

    const qs = request.query;
    const serializedQuery = serializeContext(qs);
    const serializedAuth = this.serializeAuthorization(request);

    return `${prefix}:${serializedAuth}:${serializedQuery}`;
  }

  private serializeAuthorization(request: express.Request): string {
    if (typeof request.get !== 'function') {
      return 'account=&apiKey=';
    }
    const account = this.getAuthAccount(request);
    const apiKey = request.get('X-API-Key') ?? '';
    return `account=${account}&apiKey=${apiKey}`;
  }

  private getAuthAccount(request: express.Request): string {
    try {
      const payload = getDecodedAuthTokenFromRequest(request);
      return typeof payload?.account === 'string' ? payload.account.toLowerCase() : '';
    } catch {
      return '';
    }
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const key = this.trackBy(context);
    const ttlValueOrFactory =
      this.reflector.get<TtlMetadata>(CACHE_TTL_METADATA, context.getHandler()) ??
      this.reflector.get<TtlMetadata>(CACHE_TTL_METADATA, context.getClass()) ??
      null;

    if (!key) {
      return next.handle();
    }

    try {
      const cached = await this.cacheManager.get(key);
      const response = context.switchToHttp().getResponse<express.Response>();

      if (!isNil(cached)) {
        if (isEnvelope(cached)) {
          this.applyHeaders(response, cached.headers);
          return of(cached.body);
        }
        return of(cached);
      }

      const ttl = typeof ttlValueOrFactory === 'function' ? await ttlValueOrFactory(context) : ttlValueOrFactory;

      return next.handle().pipe(
        tap(async (body: unknown) => {
          if (body instanceof StreamableFile) {
            return;
          }
          const envelope: HttpCacheEnvelope<unknown> = {
            [ENVELOPE_MARKER]: true,
            body,
            headers: this.captureHeaders(response)
          };
          const args: unknown[] = [key, envelope];
          if (!isNil(ttl)) {
            args.push(this.isCacheManagerV5 ? ttl : { ttl });
          }
          try {
            await (this.cacheManager.set as (...rest: unknown[]) => Promise<void>)(...args);
          } catch (err) {
            this.logger.error(`Failed to set cache for key "${key}"`, err instanceof Error ? err.stack : String(err));
          }
        })
      );
    } catch {
      return next.handle();
    }
  }

  private get isCacheManagerV5(): boolean {
    return (this as unknown as { cacheManagerIsv5OrGreater?: boolean }).cacheManagerIsv5OrGreater ?? true;
  }

  private captureHeaders(response: express.Response | undefined): Record<string, string> {
    const headers: Record<string, string> = {};
    if (!response || typeof response.getHeader !== 'function') {
      return headers;
    }
    for (const name of CACHED_HEADER_NAMES) {
      const value = response.getHeader(name);
      if (!isNil(value)) {
        headers[name] = String(value);
      }
    }
    return headers;
  }

  private applyHeaders(response: express.Response | undefined, headers: Record<string, string>): void {
    if (!response || typeof response.setHeader !== 'function') {
      return;
    }
    for (const [name, value] of Object.entries(headers)) {
      response.setHeader(name, value);
    }
  }
}
