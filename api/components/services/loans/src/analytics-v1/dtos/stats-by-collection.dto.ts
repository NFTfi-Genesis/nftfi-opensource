import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class StatsByCollectionDto {
  @Expose()
  @ApiProperty()
  collectionId: number;

  @Expose()
  @ApiProperty()
  collectionName: string;

  @Expose()
  @ApiProperty({ nullable: true })
  collectionImageUrl: string | null;

  @Expose()
  @ApiProperty()
  totalUsdValue: number;

  @Expose()
  @ApiProperty()
  avgUsdValue: number;

  @Expose()
  @ApiProperty()
  avgApr: number;

  @Expose()
  @ApiProperty()
  loanCount: number;

  @Expose()
  @ApiProperty()
  percentageOfTotal: number;
}
