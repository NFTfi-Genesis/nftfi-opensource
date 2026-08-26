import { Catch, HttpException, RpcExceptionFilter as BaseRpcExceptionFilter } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { HttpStatusCode } from 'axios';
import { Observable, throwError } from 'rxjs';

export enum RpcErrorType {
  Internal = 'RpcInternalError',
  EntityNotFound = 'RpcEntityNotFoundError',
  Validation = 'RpcValidationError',
  Conflict = 'RpcConflictError'
}

export interface RpcErrorPayload {
  type: RpcErrorType;
  message: string;
}

const CodeToType = {
  [HttpStatusCode.NotFound]: RpcErrorType.EntityNotFound,
  [HttpStatusCode.UnprocessableEntity]: RpcErrorType.Validation,
  [HttpStatusCode.Conflict]: RpcErrorType.Conflict
};

@Catch(HttpException)
export class HttpToRpcExceptionFilter implements BaseRpcExceptionFilter {
  catch(exception: HttpException): Observable<RpcException> {
    const code = exception.getStatus();

    let type: RpcErrorType = CodeToType[code] || RpcErrorType.Internal;

    return throwError(() => {
      const error: RpcErrorPayload = {
        type,
        message: exception.message
      };
      return new RpcException(error);
    });
  }
}
