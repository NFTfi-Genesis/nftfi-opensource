import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger, HttpException } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { Request } from 'express';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { RpcException } from '@nestjs/microservices';
import { PATTERN_METADATA } from '@nestjs/microservices/constants';
import { Reflector } from '@nestjs/core';
import { first } from 'lodash';
import { HttpToRpcExceptionFilter, RpcErrorPayload } from '../filters';

@Injectable()
export class RpcLoggingInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const className = context.getClass().name;
    const logger = new Logger(className);

    if (context.getType() !== 'rpc') {
      logger.warn(`${RpcLoggingInterceptor.name} used in a non-RPC context: ${context.getType()}`);
      return next.handle();
    }

    const metadataKey = first(this.reflector.get<string>(PATTERN_METADATA, context.getHandler()) || []);
    if (!metadataKey) {
      logger.warn(`${RpcLoggingInterceptor.name} no metadata found: ${context.getHandler().name}`);
      return next.handle();
    }

    const now = Date.now();
    const data: Request = context.switchToRpc().getData();
    const datastr = data ? ` -d ${JSON.stringify(data)}` : '';
    const reqId = nanoid();
    return next.handle().pipe(
      tap(() => {
        logger.log(`${reqId} [RPC] ${metadataKey}${datastr} ...${Date.now() - now}ms`);
      }),
      catchError(err => {
        if (err instanceof HttpException) {
          const resObservable = HttpToRpcExceptionFilter.prototype.catch.call(this, err);
          resObservable.subscribe({
            error: ({ error }: { error: RpcErrorPayload }) => {
              logger.error(`${reqId} [RPC] ${error.type} ${metadataKey}${datastr} ...${Date.now() - now}ms`);
            }
          });
        }
        if (err instanceof RpcException) {
          logger.error(
            `${reqId} [RPC] ${(err.getError() as RpcErrorPayload).type} ${metadataKey}${datastr} ...${
              Date.now() - now
            }ms`
          );
        }

        return throwError(() => err);
      })
    );
  }
}
