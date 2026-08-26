import { Type } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import * as Transformer from 'class-transformer';

export interface ResponseBody<T> {
  result: T;
}

export const getResponseBodyDto = <T>(classRef: Type<T>): Type<ResponseBody<T>> => {
  class ResponseBodyDto implements ResponseBody<T> {
    constructor(result: T) {
      this.result = result;
    }

    @Transformer.Expose()
    @Transformer.Type(() => classRef)
    @ApiProperty({ type: classRef })
    result: T;
  }

  Object.defineProperty(ResponseBodyDto, 'name', { value: `Result${classRef.name}` });

  return ResponseBodyDto;
};
