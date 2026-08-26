import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class CollectionStatsDto {
  @Expose()
  @ApiProperty({ type: Number, description: 'Number of loans' })
  count: number;

  @Expose()
  @ApiProperty({ type: Number, description: 'Total USD value' })
  totalUsd: number;

  @Expose()
  @ApiProperty({ type: Number, description: 'Average USD value' })
  averageUsd: number;

  @Expose()
  @ApiProperty({ type: Number, description: 'Average APR' })
  averageApr: number;

  @Expose()
  @ApiProperty({ type: Number, description: 'Average loan duration' })
  averageDuration: number;

  @Expose()
  @ApiProperty({ type: Number, description: 'Collection share (percentage)' })
  marketPct: number;
}
