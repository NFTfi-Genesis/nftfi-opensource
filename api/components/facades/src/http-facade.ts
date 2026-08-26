import { HttpModule } from '@nestjs/axios';
import { DynamicModule, Logger } from '@nestjs/common';
import { AxiosError, AxiosResponse, HttpStatusCode, isAxiosError } from 'axios';
import { firstValueFrom, Observable, retry, throwError, timer } from 'rxjs';
import { HttpFacadeModuleAsyncOptions } from './http-facade.types';

const RetryableStatus = new Set([
  HttpStatusCode.TooManyRequests,
  HttpStatusCode.ServiceUnavailable,
  HttpStatusCode.BadGateway,
  HttpStatusCode.ServiceUnavailable,
  HttpStatusCode.GatewayTimeout,
  HttpStatusCode.InternalServerError
]);
const RetryableCode = new Set(['ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED', 'EAI_AGAIN', 'ETIMEDOUT', 'ECONNABORTED']);

interface HttpFacadeConfig {
  maxRetries: number;
}

export class HttpFacade {
  protected logger: Logger = new Logger(HttpFacade.name);

  constructor(private readonly config: HttpFacadeConfig = { maxRetries: 3 }) {}

  static forRootAsync(options: HttpFacadeModuleAsyncOptions): DynamicModule {
    Object.defineProperty(this, 'name', { value: `${this.name}Module` });
    return {
      module: this,
      global: true,
      imports: [HttpModule.registerAsync(options)],
      providers: [this],
      exports: [this]
    };
  }

  protected handleUnknownError(_error: AxiosError): Observable<unknown> {
    return throwError(() => new Error('UnknownError not implemented.'));
  }

  protected wrapCall<T>(factory: Observable<AxiosResponse<T>>): Promise<AxiosResponse<T>> {
    let retries = 0;
    const maxRetries = this.config.maxRetries;

    const fib = (n: number): number => {
      if (n <= 2) return 1;
      let a = 1,
        b = 1;
      for (let i = 3; i <= n; i++) {
        const c = a + b;
        a = b;
        b = c;
      }
      return b;
    };

    return firstValueFrom(
      factory.pipe(
        retry({
          count: maxRetries,
          resetOnSuccess: true,
          delay: (error: AxiosError) => {
            if (isAxiosError(error)) {
              const method = error.config.method.toUpperCase();
              const status = error.response?.status || error.code;
              const url = error.config.url;
              const params = error.config.params ? `?${new URLSearchParams(error.config.params).toString()}` : '';
              const body = error.response?.data ? ` -d ${JSON.stringify(error.response.data)}` : '';

              if (RetryableStatus.has(error.response?.status) || RetryableCode.has(error.code)) {
                retries++;
                const retryHeaderSec = parseInt(
                  ((error.response?.headers as Record<string, string>) || {})['retry-after'],
                  10
                );
                const delaySec = !isNaN(retryHeaderSec) ? retryHeaderSec : fib(retries + 1);
                const retryMessage = `Retrying (${retries}/${maxRetries}) in ${delaySec}s`;
                this.logger.warn(`[${method}] ${status} ${url}${params}${body}; ${retryMessage}`.trim());

                return timer(delaySec * 1000);
              }

              this.logger.warn(`[${method}] ${status} ${url}${params}${body}`.trim());
            }

            return this.handleUnknownError(error);
          }
        })
      )
    ) as Promise<AxiosResponse<T>>;
  }
}
