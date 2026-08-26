import { Type } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import * as Transformer from 'class-transformer';

export interface HttpPaginatedResponse<T> {
  results: T[];
}

export const getHttpPaginatedResponseDto = <T>(classRef: Type<T>): Type<unknown> => {
  class HttpPaginatedResponseDto implements HttpPaginatedResponse<T> {
    @Transformer.Expose()
    @Transformer.Type(() => classRef)
    @ApiProperty({ type: [classRef] })
    results: T[];
  }

  Object.defineProperty(HttpPaginatedResponseDto, 'name', { value: `Paginated${classRef.name}` });

  return HttpPaginatedResponseDto;
};
