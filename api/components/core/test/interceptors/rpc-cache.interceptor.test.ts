import { Cache, CACHE_KEY_METADATA } from '@nestjs/cache-manager';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { PATTERN_METADATA } from '@nestjs/microservices/constants';
import { RpcCacheInterceptor } from '../../src/interceptors/rpc-cache.interceptor';

describe(RpcCacheInterceptor.prototype.intercept.name, () => {
  const classPrefix = 'rpc-events';
  const handler = (): void => void 0;
  class TestController {}

  const buildExecutionContext = (args: unknown[] = []): ExecutionContext =>
    ({
      getType: jest.fn().mockReturnValue('rpc'),
      getClass: jest.fn().mockReturnValue(TestController),
      getHandler: jest.fn().mockReturnValue(handler),
      getArgs: jest.fn().mockReturnValue(args)
    } as unknown as ExecutionContext);

  const buildReflector = (pattern: string[] | null = ['test-pattern']): Reflector =>
    ({
      get: jest.fn((key: string, target: unknown) => {
        if (key === CACHE_KEY_METADATA && target === TestController) return classPrefix;
        if (key === PATTERN_METADATA && target === handler) return pattern;
        return null;
      })
    } as unknown as Reflector);

  it('should return null for non-RPC context', () => {
    const executionContext = {
      getType: jest.fn().mockReturnValue('http')
    } as unknown as ExecutionContext;

    const interceptor = new RpcCacheInterceptor(null as Cache, null as Reflector);
    const result = interceptor.trackBy(executionContext);

    expect(result).toBeNull();
  });

  it('should return null for RPC context without metadata', () => {
    const executionContext = buildExecutionContext();
    const interceptor = new RpcCacheInterceptor(null as Cache, buildReflector(null));
    const result = interceptor.trackBy(executionContext);

    expect(result).toBeNull();
  });

  it('should return null for RPC context with empty metadata', () => {
    const executionContext = buildExecutionContext();
    const interceptor = new RpcCacheInterceptor(null as Cache, buildReflector([]));
    const result = interceptor.trackBy(executionContext);

    expect(result).toBeNull();
  });

  it('should return root key for RPC context with metadata but without payload', () => {
    const executionContext = buildExecutionContext();
    const interceptor = new RpcCacheInterceptor(null as Cache, buildReflector(['test-pattern']));
    const result = interceptor.trackBy(executionContext);

    expect(result).toBe('rpc-events:rpc:test-pattern');
  });

  it('should default class prefix to empty string when metadata is missing', () => {
    const executionContext = buildExecutionContext();
    const reflector = {
      get: jest.fn((key: string, target: unknown) => {
        if (key === PATTERN_METADATA && target === handler) return ['test-pattern'];
        return undefined;
      })
    } as unknown as Reflector;
    const interceptor = new RpcCacheInterceptor(null as Cache, reflector);
    const result = interceptor.trackBy(executionContext);

    expect(result).toBe(':rpc:test-pattern');
  });

  it('should return full key for RPC context with metadata and payload', () => {
    const executionContext = buildExecutionContext([{ userId: 123, action: 'create' }]);
    const interceptor = new RpcCacheInterceptor(null as Cache, buildReflector(['test-pattern']));
    const result = interceptor.trackBy(executionContext);

    expect(result).toBe('rpc-events:rpc:test-pattern:action=create&userId=123');
  });

  it('should return root key when payload serializes to empty string', () => {
    const executionContext = buildExecutionContext([{}]);
    const interceptor = new RpcCacheInterceptor(null as Cache, buildReflector(['test-pattern']));
    const result = interceptor.trackBy(executionContext);

    expect(result).toBe('rpc-events:rpc:test-pattern');
  });

  it('should exclude certain properties from the cache key', () => {
    const executionContext = buildExecutionContext([{ caller: 'service-a', data: 'value' }]);
    const interceptor = new RpcCacheInterceptor(null as Cache, buildReflector(['test-pattern']));
    const result = interceptor.trackBy(executionContext);

    expect(result).toBe('rpc-events:rpc:test-pattern:data=value');
  });

  it('should serialize Date values using ISO string', () => {
    const date = new Date('2023-01-01T00:00:00Z');
    const executionContext = buildExecutionContext([{ createdAt: date }]);
    const interceptor = new RpcCacheInterceptor(null as Cache, buildReflector(['test-pattern']));
    const result = interceptor.trackBy(executionContext);

    expect(result).toBe('rpc-events:rpc:test-pattern:createdAt=2023-01-01T00:00:00.000Z');
  });

  it('should serialize arrays with indexed paths', () => {
    const executionContext = buildExecutionContext([{ tags: ['foo', 'bar'] }]);
    const interceptor = new RpcCacheInterceptor(null as Cache, buildReflector(['test-pattern']));
    const result = interceptor.trackBy(executionContext);

    expect(result).toBe('rpc-events:rpc:test-pattern:tags[0]=foo&tags[1]=bar');
  });

  it('should fall back to stringifying unknown types', () => {
    const executionContext = buildExecutionContext([{ meta: Symbol('test') }]);
    const interceptor = new RpcCacheInterceptor(null as Cache, buildReflector(['test-pattern']));
    const result = interceptor.trackBy(executionContext);

    expect(result).toBe('rpc-events:rpc:test-pattern:meta=Symbol(test)');
  });
});
