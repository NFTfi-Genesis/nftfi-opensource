import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  HttpException,
  HttpStatus,
  Type
} from '@nestjs/common';
import { nanoid } from 'nanoid';
import { Request } from 'express';
import { Observable, throwError } from 'rxjs';
import { PrometheusController } from '@willsoto/nestjs-prometheus';
import { catchError, tap } from 'rxjs/operators';
import { HealthController } from '@nftfi.api/modules/health';

interface Params {
  excludeControllers?: Type[];
}

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly excludedControllers: string[];
  private readonly errorStatuses = [HttpStatus.UNPROCESSABLE_ENTITY, HttpStatus.BAD_REQUEST];

  constructor(params: Params = {}) {
    this.excludedControllers = (params.excludeControllers || [HealthController, PrometheusController]).map(c => c.name);
    this.excludedControllers.forEach(c => Logger.log(`Excluding controller: ${c}`, HttpLoggingInterceptor.name));
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const className = context.getClass().name;
    if (this.excludedControllers.includes(className)) return next.handle();

    const logger = new Logger(className);
    const now = Date.now();
    const req: Request = context.switchToHttp().getRequest();
    const reqId = nanoid();
    return next.handle().pipe(
      tap(() => {
        logger.log(`${reqId} [${req.method}] ${req.url} ...${Date.now() - now}ms`);
      }),
      catchError(err => {
        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        if (err instanceof HttpException) {
          status = err.getStatus();
        }

        const details = this.errorStatuses.includes(status)
          ? ` | req: ${JSON.stringify(req.body)} | res: ${JSON.stringify(err.getResponse())}`
          : '';
        logger.error(`${reqId} [${req.method}] ${status} ${req.url} ...${Date.now() - now}ms${details}`);

        return throwError(() => err);
      })
    );
  }
}
