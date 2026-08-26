import { Optional } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEnum, IsOptional, ValidateIf } from 'class-validator';

export enum SortDirection {
  Asc = 'asc',
  Desc = 'desc'
}

export class SortingDto<T> {
  @Expose()
  @IsOptional()
  @Optional()
  @ApiProperty({ type: String, required: false })
  sortBy: T;

  @Expose()
  @IsEnum(SortDirection)
  @ValidateIf((v: SortingDto<T>) => !!v.sortBy)
  @ApiProperty({ type: String, enum: SortDirection, required: false })
  sortDirection: SortDirection;
}
