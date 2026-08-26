import { HttpException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { HttpToRpcExceptionFilter, RpcErrorPayload, RpcErrorType } from '../src/filters/http-to-rpc-exception.filter';

describe(HttpToRpcExceptionFilter.name, () => {
  let filter: HttpToRpcExceptionFilter;
  beforeEach(() => {
    filter = new HttpToRpcExceptionFilter();
  });

  describe(HttpToRpcExceptionFilter.prototype.catch.name, () => {
    it('transforms HttpException to RpcException with correct payload', done => {
      const httpException = new HttpException('Not Found', 404);

      const observable = filter.catch(httpException);
      observable.subscribe({
        error: (rpcException: RpcException) => {
          const errorPayload = rpcException.getError() as RpcErrorPayload;
          expect(errorPayload.type).toBe(RpcErrorType.EntityNotFound);
          expect(errorPayload.message).toBe('Not Found');
          done();
        }
      });
    });

    it('defaults to Internal error type for unknown status codes', done => {
      const httpException = new HttpException('Some Error', 500);

      const observable = filter.catch(httpException);
      observable.subscribe({
        error: (rpcException: RpcException) => {
          const errorPayload = rpcException.getError() as RpcErrorPayload;
          expect(errorPayload.type).toBe(RpcErrorType.Internal);
          expect(errorPayload.message).toBe('Some Error');
          done();
        }
      });
    });
  });
});
