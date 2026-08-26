import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CurrencyBreakdownDto {
  @Expose()
  @ApiProperty()
  currency: string;

  @Expose()
  @ApiProperty()
  totalUsd: number;

  @Expose()
  @ApiProperty()
  totalNative: number;
}
