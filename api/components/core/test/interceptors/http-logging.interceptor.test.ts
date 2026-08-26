import { ExecutionContext, HttpException, Logger } from '@nestjs/common';
import { firstValueFrom, Observable } from 'rxjs';
import * as rxjsOperators from 'rxjs/operators';
import { HttpLoggingInterceptor } from '../../src/interceptors/http-logging.interceptor';

jest.mock('rxjs');
jest.mock('rxjs/operators');
jest.mock('nanoid', () => {
  return {
    nanoid: (): string => Math.random().toString().substring(2)
  };
});

describe(HttpLoggingInterceptor.name, () => {
  let interceptor: HttpLoggingInterceptor;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger, 'log').mockImplementation(jest.fn());

    interceptor = new HttpLoggingInterceptor();
  });

  describe(HttpLoggingInterceptor.prototype.intercept.name, () => {
    it('logs successful response', async () => {
      const executionContext = {
        switchToHttp: jest.fn().mockReturnThis(),
        getRequest: jest.fn().mockReturnValue({ method: 'GET', url: '/test' }),
        getClass: jest.fn().mockReturnValue({ name: 'TestController' })
      } as unknown as ExecutionContext;
      const callHandler = {
        handle: jest.fn().mockReturnValueOnce({ pipe: jest.fn() })
      };
      jest.spyOn(Date, 'now').mockReturnValueOnce(100).mockReturnValueOnce(200);
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.2);
      const fnRxTap = jest.spyOn(rxjsOperators, 'tap');
      const fnLog = jest.spyOn(Logger.prototype, 'log').mockImplementation(jest.fn());
      callHandler.handle.mockResolvedValueOnce('next handle');

      await firstValueFrom(interceptor.intercept(executionContext, callHandler));
      fnRxTap.mock.calls[0][0](callHandler);

      expect(callHandler.handle).toHaveBeenCalledTimes(1);
      expect(fnLog).toHaveBeenCalledTimes(1);
      expect(fnLog).toHaveBeenCalledWith('2 [GET] /test ...100ms');
    });

    it('logs error response', async () => {
      const executionContext = {
        switchToHttp: jest.fn().mockReturnThis(),
        getRequest: jest.fn().mockReturnValue({ method: 'GET', url: '/test' }),
        getClass: jest.fn().mockReturnValue({ name: 'TestController' })
      } as unknown as ExecutionContext;
      const callHandler = {
        handle: jest.fn().mockReturnValueOnce({ pipe: jest.fn() })
      };
      jest.spyOn(Date, 'now').mockReturnValueOnce(100).mockReturnValueOnce(200);
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.5);
      const fnRxCatchError = jest.spyOn(rxjsOperators, 'catchError');
      const fnLog = jest.spyOn(Logger.prototype, 'error').mockImplementation(jest.fn());
      callHandler.handle.mockResolvedValueOnce('next handle');

      await firstValueFrom(interceptor.intercept(executionContext, callHandler));
      fnRxCatchError.mock.calls[0][0](new HttpException('test', 500), new Observable());

      expect(callHandler.handle).toHaveBeenCalledTimes(1);
      expect(fnLog).toHaveBeenCalledTimes(1);
      expect(fnLog).toHaveBeenCalledWith('5 [GET] 500 /test ...100ms');
    });

    it('logs error response on 422 status', async () => {
      const executionContext = {
        switchToHttp: jest.fn().mockReturnThis(),
        getRequest: jest.fn().mockReturnValue({ method: 'GET', url: '/test', body: { wallet: '0x1' } }),
        getClass: jest.fn().mockReturnValue({ name: 'TestController' })
      } as unknown as ExecutionContext;
      const callHandler = {
        handle: jest.fn().mockReturnValueOnce({ pipe: jest.fn() })
      };
      jest.spyOn(Date, 'now').mockReturnValueOnce(100).mockReturnValueOnce(200);
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.422);
      const fnRxCatchError = jest.spyOn(rxjsOperators, 'catchError');
      const fnLog = jest.spyOn(Logger.prototype, 'error').mockImplementation(jest.fn());
      callHandler.handle.mockResolvedValueOnce('next handle');

      await firstValueFrom(interceptor.intercept(executionContext, callHandler));
      fnRxCatchError.mock.calls[0][0](new HttpException({ foo: 'bar' }, 422), new Observable());

      expect(callHandler.handle).toHaveBeenCalledTimes(1);
      expect(fnLog).toHaveBeenCalledTimes(1);
      expect(fnLog).toHaveBeenCalledWith('422 [GET] 422 /test ...100ms | req: {"wallet":"0x1"} | res: {"foo":"bar"}');
    });

    it('logs error response on 400 status', async () => {
      const executionContext = {
        switchToHttp: jest.fn().mockReturnThis(),
        getRequest: jest.fn().mockReturnValue({ method: 'POST', url: '/test', body: {} }),
        getClass: jest.fn().mockReturnValue({ name: 'TestController' })
      } as unknown as ExecutionContext;
      const callHandler = {
        handle: jest.fn().mockReturnValueOnce({ pipe: jest.fn() })
      };
      jest.spyOn(Date, 'now').mockReturnValueOnce(100).mockReturnValueOnce(200);
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.4);
      const fnRxCatchError = jest.spyOn(rxjsOperators, 'catchError');
      const fnLog = jest.spyOn(Logger.prototype, 'error').mockImplementation(jest.fn());
      callHandler.handle.mockResolvedValueOnce('next handle');

      await firstValueFrom(interceptor.intercept(executionContext, callHandler));
      fnRxCatchError.mock.calls[0][0](new HttpException({ message: 'bad' }, 400), new Observable());

      expect(callHandler.handle).toHaveBeenCalledTimes(1);
      expect(fnLog).toHaveBeenCalledTimes(1);
      expect(fnLog).toHaveBeenCalledWith('4 [POST] 400 /test ...100ms | req: {} | res: {"message":"bad"}');
    });
  });
});
