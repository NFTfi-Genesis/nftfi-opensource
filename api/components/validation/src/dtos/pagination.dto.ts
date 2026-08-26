import { isNumber } from 'lodash';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { toNumber } from '../transformers';

export class PaginationDto {
  @Expose()
  @Transform(toNumber)
  @Transform(({ value }) => (!isNumber(value) ? 1 : value)) // default page is 1
  @IsNumber()
  @Min(1)
  @IsOptional()
  @ApiProperty({ type: Number, required: false })
  page: number;

  @Expose()
  @Transform(toNumber)
  @Transform(({ value }) => (!isNumber(value) ? 100 : value)) // default limit is 100
  @IsNumber()
  @Min(1)
  @Max(200)
  @IsOptional()
  @ApiProperty({ type: Number, required: false })
  limit: number;
}
