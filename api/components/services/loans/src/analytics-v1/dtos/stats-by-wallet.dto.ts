import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class StatsByWalletDto {
  @Expose()
  @ApiProperty()
  wallet: string;

  @Expose()
  @ApiProperty()
  lenderLoansCount: number;

  @Expose()
  @ApiProperty()
  borrowerLoansCount: number;

  @Expose()
  @ApiProperty()
  lenderTotalAmountUsd: number;

  @Expose()
  @ApiProperty()
  borrowerTotalAmountUsd: number;
}
