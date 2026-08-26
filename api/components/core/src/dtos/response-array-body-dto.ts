import { Type } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import * as Transformer from 'class-transformer';

export interface ResponseArrayBody<T> {
  results: T[];
}

export const getResponseArrayBodyDto = <T>(classRef: Type<T>): Type<ResponseArrayBody<T>> => {
  class ResponseArrayBodyDto implements ResponseArrayBody<T> {
    constructor(results: T[]) {
      this.results = results;
    }

    @Transformer.Expose()
    @Transformer.Type(() => classRef)
    @ApiProperty({ type: [classRef] })
    results: T[];
  }

  Object.defineProperty(ResponseArrayBodyDto, 'name', { value: `Results${classRef.name}` });

  return ResponseArrayBodyDto;
};
