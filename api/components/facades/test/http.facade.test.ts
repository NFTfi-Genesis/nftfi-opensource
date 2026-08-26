import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { defer, of, throwError } from 'rxjs';
import { AxiosError, AxiosResponse, HttpStatusCode } from 'axios';
import { HttpFacade } from '@nftfi.api/facades/http-facade';

describe(HttpFacade.name, () => {
  let facade: HttpFacade;
  let httpService: HttpService;

  beforeEach(async () => {
    jest.resetAllMocks();

    facade = new HttpFacade({ maxRetries: 2 });
    httpService = {
      get: jest.fn(),
      post: jest.fn()
    } as unknown as HttpService;

    jest.spyOn(Logger.prototype, 'error').mockImplementation(jest.fn());
  });

  describe(HttpFacade.forRootAsync.name, () => {
    it('should register HttpModule and provide HttpFacade', async () => {
      class MockHttpModule extends HttpFacade {}
      const module = MockHttpModule.forRootAsync({
        useFactory: () => ({})
      });

      expect(module.module).toBe(MockHttpModule);
      expect(module.providers).toContain(MockHttpModule);
      expect(module.exports).toContain(MockHttpModule);
    });
  });

  describe(HttpFacade.prototype['wrapCall'].name, () => {
    it('retries on axios error', async () => {
      jest.useFakeTimers();
      let count = 0;
      jest.spyOn(httpService, 'get').mockImplementationOnce(() =>
        defer(() => {
          if (count < 2) {
            count++;
            return throwError(
              () =>
                ({
                  message: 'Request failed',
                  config: { method: 'GET', url: '/test' },
                  response: {
                    status: HttpStatusCode.TooManyRequests,
                    headers: { 'retry-after': '60' },
                    data: null,
                    statusText: '',
                    config: null
                  } as AxiosResponse,
                  isAxiosError: true
                } as AxiosError)
            );
          }
          return of({ data: { foo: 'bar' } } as unknown as AxiosResponse);
        })
      );

      const promise = facade['wrapCall'](httpService.get('/'));

      jest.runAllTimers();

      const result = await promise;

      expect(result).toBeDefined();
    });

    it('falls back on axios config error values', async () => {
      jest.useFakeTimers();
      let count = 0;
      jest.spyOn(httpService, 'get').mockImplementationOnce(() =>
        defer(() => {
          if (count < 1) {
            count++;
            return throwError(
              () =>
                ({
                  message: 'Request failed',
                  config: { method: 'GET', url: '/test', params: '?q=test' },
                  code: 'ECONNREFUSED',
                  response: {
                    status: undefined,
                    headers: { 'retry-after': '60' },
                    data: { foo: 'bar' },
                    statusText: '',
                    config: null
                  } as AxiosResponse,
                  isAxiosError: true
                } as AxiosError)
            );
          }
          return of({ data: { foo: 'bar' } } as unknown as AxiosResponse);
        })
      );
      const promise = facade['wrapCall'](httpService.get('/test', { params: { q: 'test' } }));

      jest.runAllTimers();

      const result = await promise;

      expect(result).toBeDefined();
    });

    it('throws error on non-retryable axios error', async () => {
      const fnGet = jest
        .spyOn(httpService, 'get')
        .mockImplementation(() => throwError(() => new Error('Request failed')));

      const promise = facade['wrapCall'](httpService.get('/test'));

      await expect(promise).rejects.toThrow('UnknownError not implemented.');
      expect(fnGet).toHaveBeenCalledWith('/test');
    });

    it('throws NotFoundError on 404', async () => {
      const fnGet = jest.spyOn(httpService, 'get').mockImplementation(() =>
        throwError(
          () =>
            ({
              response: { status: HttpStatusCode.NotFound, data: null },
              isAxiosError: true,
              config: { method: 'GET', url: '/test' }
            } as AxiosError)
        )
      );

      const promise = facade['wrapCall'](httpService.get('/test'));

      await expect(promise).rejects.toThrow('UnknownError not implemented.');
      expect(fnGet).toHaveBeenCalledWith('/test');
    });
  });
});
