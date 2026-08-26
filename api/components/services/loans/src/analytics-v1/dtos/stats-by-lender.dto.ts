import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class StatsByLenderDto {
  @Expose()
  @ApiProperty()
  lender: string;

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
}
