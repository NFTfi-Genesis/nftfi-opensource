import { ExecutionContext, HttpException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, Observable } from 'rxjs';
import * as rxjsOperators from 'rxjs/operators';
import { RpcException } from '@nestjs/microservices';
import { HttpToRpcExceptionFilter } from '@nftfi.api/core/filters';
import { RpcLoggingInterceptor } from '../../src/interceptors/rpc-logging.interceptor';

jest.mock('rxjs');
jest.mock('rxjs/operators');
jest.mock('nanoid', () => {
  return {
    nanoid: (): string => Math.random().toString().substring(2)
  };
});

describe(RpcLoggingInterceptor.name, () => {
  let interceptor: RpcLoggingInterceptor;
  let reflector: Reflector;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger, 'log').mockImplementation(jest.fn());

    reflector = { get: jest.fn().mockReturnValue(['TEST_PATTERN']) } as unknown as Reflector;
    interceptor = new RpcLoggingInterceptor(reflector);
  });

  describe(RpcLoggingInterceptor.prototype.intercept.name, () => {
    it('logs successful response', async () => {
      const executionContext = {
        switchToRpc: jest.fn().mockReturnThis(),
        getHandler: jest.fn().mockReturnValue(() => {}),
        getData: jest.fn().mockReturnValue({ foo: 'bar' }),
        getClass: jest.fn().mockReturnValue({ name: 'TestController' }),
        getType: jest.fn().mockReturnValue('rpc')
      } as unknown as ExecutionContext;
      const callHandler = {
        handle: jest.fn().mockReturnValueOnce({ pipe: jest.fn() })
      };
      jest.spyOn(reflector, 'get').mockReturnValueOnce(['test-pattern']);
      jest.spyOn(Date, 'now').mockReturnValueOnce(100).mockReturnValueOnce(200);
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.2);
      const fnRxTap = jest.spyOn(rxjsOperators, 'tap');
      const fnLog = jest.spyOn(Logger.prototype, 'log').mockImplementation(jest.fn());
      callHandler.handle.mockResolvedValueOnce('next handle');

      await firstValueFrom(interceptor.intercept(executionContext, callHandler));
      fnRxTap.mock.calls[0][0](callHandler);

      expect(callHandler.handle).toHaveBeenCalledTimes(1);
      expect(fnLog).toHaveBeenCalledWith('2 [RPC] test-pattern -d {"foo":"bar"} ...100ms');
    });

    it('logs with empty data', async () => {
      const executionContext = {
        switchToRpc: jest.fn().mockReturnThis(),
        getData: jest.fn().mockReturnValue(null),
        getType: jest.fn().mockReturnValue('rpc'),
        getClass: jest.fn().mockReturnValue({ name: 'TestController' }),
        getHandler: jest.fn().mockReturnValue(() => {})
      } as unknown as ExecutionContext;
      const callHandler = {
        handle: jest.fn().mockReturnValueOnce({ pipe: jest.fn() })
      };
      jest.spyOn(Date, 'now').mockReturnValueOnce(100).mockReturnValueOnce(200);
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.3);
      jest.spyOn(reflector, 'get').mockReturnValueOnce(['test-pattern']);
      const fnRxTap = jest.spyOn(rxjsOperators, 'tap');
      const fnLog = jest.spyOn(Logger.prototype, 'log').mockImplementation(jest.fn());
      callHandler.handle.mockResolvedValueOnce('next handle');

      await firstValueFrom(interceptor.intercept(executionContext, callHandler));
      fnRxTap.mock.calls[0][0](callHandler);

      expect(callHandler.handle).toHaveBeenCalledTimes(1);
      expect(fnLog).toHaveBeenCalledWith('3 [RPC] test-pattern ...100ms');
    });

    it('returns next.handle() directly for non-rpc context', async () => {
      const executionContext = {
        getType: jest.fn().mockReturnValue('http'),
        getClass: jest.fn().mockReturnValue({ name: 'TestController' })
      } as unknown as ExecutionContext;
      const fnHandlePipe = jest.fn();
      const fnHandle = jest.fn();
      const mockNext = {
        handle: fnHandle.mockReturnValue({
          pipe: fnHandlePipe
        })
      };

      await firstValueFrom(interceptor.intercept(executionContext, mockNext));
      expect(mockNext.handle).toHaveBeenCalledTimes(1);
      expect(fnHandlePipe).not.toHaveBeenCalled();
    });

    it('returns next.handle() directly when no metadata found', async () => {
      const executionContext = {
        getType: jest.fn().mockReturnValue('rpc'),
        getHandler: jest.fn().mockReturnValue(() => {}),
        getClass: jest.fn().mockReturnValue({ name: 'TestController' })
      } as unknown as ExecutionContext;
      jest.spyOn(reflector, 'get').mockReturnValueOnce(undefined);
      const fnHandlePipe = jest.fn();
      const fnHandle = jest.fn();
      const mockNext = {
        handle: fnHandle.mockReturnValue({
          pipe: fnHandlePipe
        })
      };

      await firstValueFrom(interceptor.intercept(executionContext, mockNext));
      expect(mockNext.handle).toHaveBeenCalledTimes(1);
      expect(fnHandlePipe).not.toHaveBeenCalled();
    });

    it('logs http exception response', async () => {
      const executionContext = {
        switchToRpc: jest.fn().mockReturnThis(),
        getData: jest.fn().mockReturnValue({ method: 'GET', url: '/test' }),
        getType: jest.fn().mockReturnValue('rpc'),
        getClass: jest.fn().mockReturnValue({ name: 'TestController' }),
        getHandler: jest.fn().mockReturnValue(() => {})
      } as unknown as ExecutionContext;
      const callHandler = {
        handle: jest.fn().mockReturnValueOnce({ pipe: jest.fn() })
      };
      jest.spyOn(Date, 'now').mockReturnValueOnce(100).mockReturnValueOnce(200);
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.5);
      jest.spyOn(reflector, 'get').mockReturnValueOnce(['test-pattern']);
      jest.spyOn(HttpToRpcExceptionFilter.prototype, 'catch').mockReturnValueOnce({
        subscribe: jest.fn().mockImplementation(({ error }) => {
          error({ error: { type: 'RpcInternalError' } });
        })
      } as unknown as Observable<RpcException>);
      const fnRxCatchError = jest.spyOn(rxjsOperators, 'catchError');
      const fnLog = jest.spyOn(Logger.prototype, 'error').mockImplementation(jest.fn());
      callHandler.handle.mockResolvedValueOnce('next handle');

      await firstValueFrom(interceptor.intercept(executionContext, callHandler));
      fnRxCatchError.mock.calls[0][0](new HttpException('test', 500), new Observable());

      expect(callHandler.handle).toHaveBeenCalledTimes(1);
      expect(fnLog).toHaveBeenCalledTimes(1);
      expect(fnLog).toHaveBeenCalledWith(
        '5 [RPC] RpcInternalError test-pattern -d {"method":"GET","url":"/test"} ...100ms'
      );
    });

    it('logs rpc exception response', async () => {
      const executionContext = {
        switchToRpc: jest.fn().mockReturnThis(),
        getData: jest.fn().mockReturnValue({ foo: 'bar' }),
        getType: jest.fn().mockReturnValue('rpc'),
        getClass: jest.fn().mockReturnValue({ name: 'TestController' }),
        getHandler: jest.fn().mockReturnValue(() => {})
      } as unknown as ExecutionContext;
      const callHandler = {
        handle: jest.fn().mockReturnValueOnce({ pipe: jest.fn() })
      };
      jest.spyOn(Date, 'now').mockReturnValueOnce(100).mockReturnValueOnce(200);
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.8);
      jest.spyOn(reflector, 'get').mockReturnValueOnce(['test-pattern']);
      const fnRxCatchError = jest.spyOn(rxjsOperators, 'catchError');
      const fnLog = jest.spyOn(Logger.prototype, 'error').mockImplementation(jest.fn());
      callHandler.handle.mockResolvedValueOnce('next handle');

      await firstValueFrom(interceptor.intercept(executionContext, callHandler));
      fnRxCatchError.mock.calls[0][0](new RpcException({ type: 'RpcTestError' }), new Observable());

      expect(callHandler.handle).toHaveBeenCalledTimes(1);
      expect(fnLog).toHaveBeenCalledTimes(1);
      expect(fnLog).toHaveBeenCalledWith('8 [RPC] RpcTestError test-pattern -d {"foo":"bar"} ...100ms');
    });
  });
});
