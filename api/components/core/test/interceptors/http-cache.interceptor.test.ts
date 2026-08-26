import { CACHE_KEY_METADATA, CACHE_TTL_METADATA, Cache } from '@nestjs/cache-manager';
import { CallHandler, ExecutionContext, StreamableFile } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, firstValueFrom, of } from 'rxjs';
import { HttpResponseHeader } from '../../src/dtos/http-response';
import { HttpCacheInterceptor } from '../../src/interceptors/http-cache.interceptor';

describe(HttpCacheInterceptor.name, () => {
  const handler = (): void => void 0;
  class TestController {}

  const buildReflector = (): Reflector =>
    ({
      get: jest.fn((key: string, target: unknown) => {
        if (key !== CACHE_KEY_METADATA) return null;
        if (target === TestController) return 'loans';
        if (target === handler) return 'v1';
        return null;
      })
    } as unknown as Reflector);

  const buildHttpContext = (request: unknown, response?: unknown): ExecutionContext =>
    ({
      getType: jest.fn().mockReturnValue('http'),
      getClass: jest.fn().mockReturnValue(TestController),
      getHandler: jest.fn().mockReturnValue(handler),
      getArgByIndex: jest.fn().mockReturnValue(request),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ method: 'GET', ...(request as object) }),
        getResponse: jest.fn().mockReturnValue(response ?? buildResponse())
      })
    } as unknown as ExecutionContext);

  const buildResponse = (
    initialHeaders: Record<string, string> = {}
  ): {
    setHeader: jest.Mock;
    getHeader: jest.Mock;
    headers: Record<string, string>;
  } => {
    const state = { headers: { ...initialHeaders } } as { headers: Record<string, string> };
    return {
      headers: state.headers,
      setHeader: jest.fn((name: string, value: string): void => {
        state.headers[name] = value;
      }),
      getHeader: jest.fn((name: string): string | undefined => state.headers[name])
    };
  };

  const buildCacheManager = (): jest.Mocked<Pick<Cache, 'get' | 'set'>> =>
    ({
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<Pick<Cache, 'get' | 'set'>>);

  const attachHttpAdapter = (interceptor: HttpCacheInterceptor): void => {
    (interceptor as unknown as { httpAdapterHost: unknown }).httpAdapterHost = {
      httpAdapter: { getRequestUrl: jest.fn().mockReturnValue('/v1/loans') }
    };
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('trackBy', () => {
    it('returns undefined for non-http contexts', () => {
      const context = { getType: jest.fn().mockReturnValue('rpc') } as unknown as ExecutionContext;
      const interceptor = new HttpCacheInterceptor(null as unknown as Cache, buildReflector());

      expect(interceptor.trackBy(context)).toBeUndefined();
    });

    it('returns undefined for non-cacheable request methods', () => {
      const context = {
        ...buildHttpContext({ query: { page: '1' } }),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({ method: 'POST' })
        })
      } as unknown as ExecutionContext;
      const interceptor = new HttpCacheInterceptor(null as unknown as Cache, buildReflector());

      expect(interceptor.trackBy(context)).toBeUndefined();
    });

    it('returns undefined when http adapter has no getRequestUrl', () => {
      const context = buildHttpContext({ query: { page: '1' } });
      const interceptor = new HttpCacheInterceptor(null as unknown as Cache, buildReflector());
      (interceptor as unknown as { httpAdapterHost: unknown }).httpAdapterHost = { httpAdapter: {} };

      expect(interceptor.trackBy(context)).toBeUndefined();
    });

    it('returns undefined when request is missing', () => {
      const context = buildHttpContext(undefined);
      const interceptor = new HttpCacheInterceptor(null as unknown as Cache, buildReflector());
      (interceptor as unknown as { httpAdapterHost: unknown }).httpAdapterHost = {
        httpAdapter: { getRequestUrl: jest.fn() }
      };

      expect(interceptor.trackBy(context)).toBeUndefined();
    });

    it('returns undefined when httpAdapterHost is missing', () => {
      const context = buildHttpContext({ query: { page: '1' } });
      const interceptor = new HttpCacheInterceptor(null as unknown as Cache, buildReflector());

      expect(interceptor.trackBy(context)).toBeUndefined();
    });

    it('returns a serialized cache key for cacheable requests', () => {
      const request = { query: { page: '1', caller: 'api' }, method: 'GET' };
      const context = buildHttpContext(request);
      const interceptor = new HttpCacheInterceptor(null as unknown as Cache, buildReflector());
      attachHttpAdapter(interceptor);

      expect(interceptor.trackBy(context)).toBe('loans:http:v1:account=&apiKey=:page=1');
    });

    it('defaults class prefix to empty string when class cache key metadata is missing', () => {
      const request = { query: { page: '1' }, method: 'GET' };
      const context = buildHttpContext(request);
      const reflector = {
        get: jest.fn((key: string, target: unknown) => {
          if (key === CACHE_KEY_METADATA && target === handler) return 'v1';
          return undefined;
        })
      } as unknown as Reflector;
      const interceptor = new HttpCacheInterceptor(null as unknown as Cache, reflector);
      attachHttpAdapter(interceptor);

      expect(interceptor.trackBy(context)).toBe(':http:v1:account=&apiKey=:page=1');
    });

    it('includes the JWT account when an Authorization header is present', () => {
      const payload = Buffer.from(JSON.stringify({ account: '0xABCDEF0000000000000000000000000000000001' })).toString(
        'base64'
      );
      const request = {
        query: { page: '1' },
        method: 'GET',
        get: jest.fn((name: string) => (name === 'Authorization' ? `Bearer header.${payload}.sig` : undefined))
      };
      const context = buildHttpContext(request);
      const interceptor = new HttpCacheInterceptor(null as unknown as Cache, buildReflector());
      attachHttpAdapter(interceptor);

      expect(interceptor.trackBy(context)).toBe(
        'loans:http:v1:account=0xabcdef0000000000000000000000000000000001&apiKey=:page=1'
      );
    });

    it('includes the X-API-Key header when present', () => {
      const request = {
        query: { page: '1' },
        method: 'GET',
        get: jest.fn((name: string) => (name === 'X-API-Key' ? 'test-api-key' : undefined))
      };
      const context = buildHttpContext(request);
      const interceptor = new HttpCacheInterceptor(null as unknown as Cache, buildReflector());
      attachHttpAdapter(interceptor);

      expect(interceptor.trackBy(context)).toBe('loans:http:v1:account=&apiKey=test-api-key:page=1');
    });

    it('prefers X-Forwarded-Authorization over Authorization when both are present', () => {
      const forwardedPayload = Buffer.from(JSON.stringify({ account: '0xForwarded' })).toString('base64');
      const directPayload = Buffer.from(JSON.stringify({ account: '0xDirect' })).toString('base64');
      const request = {
        query: { page: '1' },
        method: 'GET',
        get: jest.fn((name: string) => {
          if (name === 'X-Forwarded-Authorization') return `Bearer h.${forwardedPayload}.s`;
          if (name === 'Authorization') return `Bearer h.${directPayload}.s`;
          return undefined;
        })
      };
      const context = buildHttpContext(request);
      const interceptor = new HttpCacheInterceptor(null as unknown as Cache, buildReflector());
      attachHttpAdapter(interceptor);

      expect(interceptor.trackBy(context)).toBe('loans:http:v1:account=0xforwarded&apiKey=:page=1');
    });

    it('falls back to empty account when the Authorization scheme is not Bearer', () => {
      const payload = Buffer.from(JSON.stringify({ account: '0xCAFE' })).toString('base64');
      const request = {
        query: { page: '1' },
        method: 'GET',
        get: jest.fn((name: string) => (name === 'Authorization' ? `Basic h.${payload}.s` : undefined))
      };
      const context = buildHttpContext(request);
      const interceptor = new HttpCacheInterceptor(null as unknown as Cache, buildReflector());
      attachHttpAdapter(interceptor);

      expect(interceptor.trackBy(context)).toBe('loans:http:v1:account=&apiKey=:page=1');
    });

    it('falls back to empty account when the JWT payload cannot be parsed', () => {
      const request = {
        query: { page: '1' },
        method: 'GET',
        get: jest.fn((name: string) => (name === 'Authorization' ? 'Bearer not.aValidJwt.payload' : undefined))
      };
      const context = buildHttpContext(request);
      const interceptor = new HttpCacheInterceptor(null as unknown as Cache, buildReflector());
      attachHttpAdapter(interceptor);

      expect(interceptor.trackBy(context)).toBe('loans:http:v1:account=&apiKey=:page=1');
    });

    it('falls back to empty account when the JWT payload has no account field', () => {
      const payload = Buffer.from(JSON.stringify({ iat: 1700000000 })).toString('base64');
      const request = {
        query: { page: '1' },
        method: 'GET',
        get: jest.fn((name: string) => (name === 'Authorization' ? `Bearer h.${payload}.s` : undefined))
      };
      const context = buildHttpContext(request);
      const interceptor = new HttpCacheInterceptor(null as unknown as Cache, buildReflector());
      attachHttpAdapter(interceptor);

      expect(interceptor.trackBy(context)).toBe('loans:http:v1:account=&apiKey=:page=1');
    });

    it('falls back to empty account when the Bearer token has no payload segment', () => {
      const request = {
        query: { page: '1' },
        method: 'GET',
        get: jest.fn((name: string) => (name === 'Authorization' ? 'Bearer onlyOneSegment' : undefined))
      };
      const context = buildHttpContext(request);
      const interceptor = new HttpCacheInterceptor(null as unknown as Cache, buildReflector());
      attachHttpAdapter(interceptor);

      expect(interceptor.trackBy(context)).toBe('loans:http:v1:account=&apiKey=:page=1');
    });

    it('skips auth serialization when the request has no get method', () => {
      const request = { query: { page: '1' }, method: 'GET' };
      const context = buildHttpContext(request);
      const interceptor = new HttpCacheInterceptor(null as unknown as Cache, buildReflector());
      attachHttpAdapter(interceptor);

      expect(interceptor.trackBy(context)).toBe('loans:http:v1:account=&apiKey=:page=1');
    });
  });

  describe('intercept', () => {
    const buildReflectorForIntercept = (ttl: number | null = 60000): Reflector =>
      ({
        get: jest.fn((key: string, target: unknown) => {
          if (key === CACHE_KEY_METADATA && target === TestController) return 'loans';
          if (key === CACHE_KEY_METADATA && target === handler) return 'v1';
          if (key === CACHE_TTL_METADATA && target === handler) return ttl;
          return undefined;
        })
      } as unknown as Reflector);

    const buildCallHandler = (value: unknown): CallHandler => ({
      handle: jest.fn().mockReturnValue(of(value))
    });

    it('passes through when no cache key resolves', async () => {
      const interceptor = new HttpCacheInterceptor(
        buildCacheManager() as unknown as Cache,
        buildReflectorForIntercept()
      );
      const context = {
        getType: jest.fn().mockReturnValue('rpc'),
        getClass: jest.fn().mockReturnValue(TestController),
        getHandler: jest.fn().mockReturnValue(handler)
      } as unknown as ExecutionContext;
      const callHandler = buildCallHandler([{ id: 'loan-1' }]);

      const stream = await interceptor.intercept(context, callHandler);
      const result = await firstValueFrom(stream as Observable<unknown>);

      expect(callHandler.handle).toHaveBeenCalled();
      expect(result).toEqual([{ id: 'loan-1' }]);
    });

    it('replays cached headers and body on envelope cache hit', async () => {
      const cacheManager = buildCacheManager();
      cacheManager.get.mockResolvedValue({
        __httpCacheEnvelope: true,
        body: [{ id: 'loan-1' }],
        headers: {
          [HttpResponseHeader.PaginationPage]: '1',
          [HttpResponseHeader.PaginationLimit]: '25',
          [HttpResponseHeader.PaginationTotal]: '137'
        }
      });
      const interceptor = new HttpCacheInterceptor(cacheManager as unknown as Cache, buildReflectorForIntercept());
      attachHttpAdapter(interceptor);
      const response = buildResponse();
      const context = buildHttpContext({ query: { page: '1' }, method: 'GET' }, response);
      const callHandler = buildCallHandler('should-not-be-invoked');

      const stream = await interceptor.intercept(context, callHandler);
      const result = await firstValueFrom(stream as Observable<unknown>);

      expect(callHandler.handle).not.toHaveBeenCalled();
      expect(cacheManager.get).toHaveBeenCalledWith('loans:http:v1:account=&apiKey=:page=1');
      expect(response.setHeader).toHaveBeenCalledWith('X-Pagination-Page', '1');
      expect(response.setHeader).toHaveBeenCalledWith('X-Pagination-Limit', '25');
      expect(response.setHeader).toHaveBeenCalledWith('X-Pagination-Total', '137');
      expect(result).toEqual([{ id: 'loan-1' }]);
    });

    it('returns legacy non-envelope cache hits unchanged without applying headers', async () => {
      const cacheManager = buildCacheManager();
      cacheManager.get.mockResolvedValue([{ id: 'loan-legacy' }]);
      const interceptor = new HttpCacheInterceptor(cacheManager as unknown as Cache, buildReflectorForIntercept());
      attachHttpAdapter(interceptor);
      const response = buildResponse();
      const context = buildHttpContext({ query: { page: '1' }, method: 'GET' }, response);
      const callHandler = buildCallHandler('should-not-be-invoked');

      const stream = await interceptor.intercept(context, callHandler);
      const result = await firstValueFrom(stream as Observable<unknown>);

      expect(callHandler.handle).not.toHaveBeenCalled();
      expect(response.setHeader).not.toHaveBeenCalled();
      expect(result).toEqual([{ id: 'loan-legacy' }]);
    });

    it('stores envelope with captured pagination headers on cache miss', async () => {
      const cacheManager = buildCacheManager();
      cacheManager.get.mockResolvedValue(undefined);
      const interceptor = new HttpCacheInterceptor(cacheManager as unknown as Cache, buildReflectorForIntercept(60000));
      attachHttpAdapter(interceptor);
      const response = buildResponse({
        'X-Pagination-Page': '2',
        'X-Pagination-Limit': '25',
        'X-Pagination-Total': '500',
        'Content-Type': 'application/json'
      });
      const context = buildHttpContext({ query: { page: '2' }, method: 'GET' }, response);
      const callHandler = buildCallHandler([{ id: 'loan-2' }]);

      const stream = await interceptor.intercept(context, callHandler);
      const result = await firstValueFrom(stream as Observable<unknown>);

      expect(result).toEqual([{ id: 'loan-2' }]);
      expect(cacheManager.set).toHaveBeenCalledWith(
        'loans:http:v1:account=&apiKey=:page=2',
        {
          __httpCacheEnvelope: true,
          body: [{ id: 'loan-2' }],
          headers: {
            'X-Pagination-Page': '2',
            'X-Pagination-Limit': '25',
            'X-Pagination-Total': '500'
          }
        },
        60000
      );
    });

    it('omits ttl argument when no @CacheTTL metadata is present', async () => {
      const cacheManager = buildCacheManager();
      cacheManager.get.mockResolvedValue(undefined);
      const interceptor = new HttpCacheInterceptor(cacheManager as unknown as Cache, buildReflectorForIntercept(null));
      attachHttpAdapter(interceptor);
      const response = buildResponse();
      const context = buildHttpContext({ query: { page: '1' }, method: 'GET' }, response);
      const callHandler = buildCallHandler([]);

      const stream = await interceptor.intercept(context, callHandler);
      await firstValueFrom(stream as Observable<unknown>);

      expect(cacheManager.set).toHaveBeenCalledWith('loans:http:v1:account=&apiKey=:page=1', {
        __httpCacheEnvelope: true,
        body: [],
        headers: {}
      });
    });

    it('does not cache StreamableFile responses', async () => {
      const cacheManager = buildCacheManager();
      cacheManager.get.mockResolvedValue(undefined);
      const interceptor = new HttpCacheInterceptor(cacheManager as unknown as Cache, buildReflectorForIntercept());
      attachHttpAdapter(interceptor);
      const response = buildResponse();
      const context = buildHttpContext({ query: { page: '1' }, method: 'GET' }, response);
      const file = new StreamableFile(new Uint8Array([1, 2, 3]));
      const callHandler = buildCallHandler(file);

      const stream = await interceptor.intercept(context, callHandler);
      const result = await firstValueFrom(stream as Observable<unknown>);

      expect(result).toBe(file);
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('falls back to handler when cacheManager.get throws', async () => {
      const cacheManager = buildCacheManager();
      cacheManager.get.mockRejectedValue(new Error('redis down'));
      const interceptor = new HttpCacheInterceptor(cacheManager as unknown as Cache, buildReflectorForIntercept());
      attachHttpAdapter(interceptor);
      const response = buildResponse();
      const context = buildHttpContext({ query: { page: '1' }, method: 'GET' }, response);
      const callHandler = buildCallHandler([{ id: 'loan-fallback' }]);

      const stream = await interceptor.intercept(context, callHandler);
      const result = await firstValueFrom(stream as Observable<unknown>);

      expect(callHandler.handle).toHaveBeenCalled();
      expect(result).toEqual([{ id: 'loan-fallback' }]);
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('resolves a TTL factory with the execution context', async () => {
      const cacheManager = buildCacheManager();
      cacheManager.get.mockResolvedValue(undefined);
      const ttlFactory = jest.fn().mockResolvedValue(30000);
      const interceptor = new HttpCacheInterceptor(
        cacheManager as unknown as Cache,
        buildReflectorForIntercept(ttlFactory as unknown as number)
      );
      attachHttpAdapter(interceptor);
      const response = buildResponse();
      const context = buildHttpContext({ query: { page: '1' }, method: 'GET' }, response);
      const callHandler = buildCallHandler([{ id: 'loan-factory' }]);

      const stream = await interceptor.intercept(context, callHandler);
      await firstValueFrom(stream as Observable<unknown>);

      expect(ttlFactory).toHaveBeenCalledWith(context);
      expect(cacheManager.set).toHaveBeenCalledWith(
        'loans:http:v1:account=&apiKey=:page=1',
        {
          __httpCacheEnvelope: true,
          body: [{ id: 'loan-factory' }],
          headers: {}
        },
        30000
      );
    });

    it('uses cache-manager v4 set signature when the parent reports a v4 store', async () => {
      const cacheManager = buildCacheManager();
      cacheManager.get.mockResolvedValue(undefined);
      const interceptor = new HttpCacheInterceptor(cacheManager as unknown as Cache, buildReflectorForIntercept(60000));
      (interceptor as unknown as { cacheManagerIsv5OrGreater: boolean }).cacheManagerIsv5OrGreater = false;
      attachHttpAdapter(interceptor);
      const response = buildResponse();
      const context = buildHttpContext({ query: { page: '1' }, method: 'GET' }, response);
      const callHandler = buildCallHandler([{ id: 'loan-v4' }]);

      const stream = await interceptor.intercept(context, callHandler);
      await firstValueFrom(stream as Observable<unknown>);

      expect(cacheManager.set).toHaveBeenCalledWith(
        'loans:http:v1:account=&apiKey=:page=1',
        {
          __httpCacheEnvelope: true,
          body: [{ id: 'loan-v4' }],
          headers: {}
        },
        { ttl: 60000 }
      );
    });

    it('skips header replay when the cached envelope hits a response without setHeader', async () => {
      const cacheManager = buildCacheManager();
      cacheManager.get.mockResolvedValue({
        __httpCacheEnvelope: true,
        body: [{ id: 'loan-no-setHeader' }],
        headers: { [HttpResponseHeader.PaginationPage]: '1' }
      });
      const interceptor = new HttpCacheInterceptor(cacheManager as unknown as Cache, buildReflectorForIntercept());
      attachHttpAdapter(interceptor);
      const responseWithoutSetHeader = {};
      const context = buildHttpContext({ query: { page: '1' } }, responseWithoutSetHeader);
      const callHandler = buildCallHandler('unused');

      const stream = await interceptor.intercept(context, callHandler);
      const result = await firstValueFrom(stream as Observable<unknown>);

      expect(result).toEqual([{ id: 'loan-no-setHeader' }]);
      expect(callHandler.handle).not.toHaveBeenCalled();
    });

    it('captures an empty header map when the response lacks getHeader on cache miss', async () => {
      const cacheManager = buildCacheManager();
      cacheManager.get.mockResolvedValue(undefined);
      const interceptor = new HttpCacheInterceptor(cacheManager as unknown as Cache, buildReflectorForIntercept(60000));
      attachHttpAdapter(interceptor);
      const responseWithoutGetHeader = {};
      const context = buildHttpContext({ query: { page: '1' } }, responseWithoutGetHeader);
      const callHandler = buildCallHandler([{ id: 'loan-no-getHeader' }]);

      const stream = await interceptor.intercept(context, callHandler);
      await firstValueFrom(stream as Observable<unknown>);

      expect(cacheManager.set).toHaveBeenCalledWith(
        'loans:http:v1:account=&apiKey=:page=1',
        {
          __httpCacheEnvelope: true,
          body: [{ id: 'loan-no-getHeader' }],
          headers: {}
        },
        60000
      );
    });

    it('swallows cacheManager.set failures without breaking the response', async () => {
      const cacheManager = buildCacheManager();
      cacheManager.get.mockResolvedValue(undefined);
      cacheManager.set.mockRejectedValue(new Error('redis write failed'));
      const interceptor = new HttpCacheInterceptor(cacheManager as unknown as Cache, buildReflectorForIntercept());
      attachHttpAdapter(interceptor);
      const response = buildResponse();
      const context = buildHttpContext({ query: { page: '1' }, method: 'GET' }, response);
      const callHandler = buildCallHandler([{ id: 'loan-3' }]);

      const stream = await interceptor.intercept(context, callHandler);
      const result = await firstValueFrom(stream as Observable<unknown>);

      expect(result).toEqual([{ id: 'loan-3' }]);
    });
  });
});
