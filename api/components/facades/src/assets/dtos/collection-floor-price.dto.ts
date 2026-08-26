import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class CollectionFloorPriceDto {
  @Expose()
  @ApiProperty()
  priceEth: number;

  @Expose()
  @ApiProperty()
  priceUsd: number;
}
