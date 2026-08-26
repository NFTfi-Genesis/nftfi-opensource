import { Type } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import * as Transformer from 'class-transformer';

export interface ResponsePaginatedBody<T> {
  results: T[];
  pagination: {
    total: number;
  };
}

export const getResponsePaginatedBodyDto = <T>(classRef: Type<T>): Type<ResponsePaginatedBody<T>> => {
  class PaginationDto {
    @Transformer.Expose()
    @ApiProperty({ type: Number })
    total: number;
  }

  class ResponsePaginatedBodyDto implements ResponsePaginatedBody<T> {
    constructor(results: T[], total: number) {
      this.results = results;
      this.pagination = { total };
    }

    @Transformer.Expose()
    @Transformer.Type(() => classRef)
    @ApiProperty({ type: [classRef] })
    results: T[];

    @Transformer.Expose()
    @Transformer.Type(() => PaginationDto)
    @ApiProperty({ type: PaginationDto })
    pagination: PaginationDto;
  }

  Object.defineProperty(ResponsePaginatedBodyDto, 'name', { value: `Results${classRef.name}` });

  return ResponsePaginatedBodyDto;
};
