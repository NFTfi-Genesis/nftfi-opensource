import { ValidationPipe } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

export const RpcValidationPipe = new ValidationPipe({
  exceptionFactory: (errors): RpcException => new RpcException(errors)
});
