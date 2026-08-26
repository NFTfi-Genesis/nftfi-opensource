import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SummaryDto {
  @Expose()
  @ApiProperty()
  totalUsdValue: number;

  @Expose()
  @ApiProperty()
  totalRepaymentUsd: number;

  @Expose()
  @ApiProperty()
  avgUsdValue: number;

  @Expose()
  @ApiProperty()
  avgApr: number;

  @Expose()
  @ApiProperty()
  weightedAvgApr: number;

  @Expose()
  @ApiProperty()
  weightedAvgDuration: number;

  @Expose()
  @ApiProperty()
  loanCount: number;

  @Expose()
  @ApiProperty()
  lendedLoansCount: number;

  @Expose()
  @ApiProperty()
  borrowedLoansCount: number;

  @Expose()
  @ApiProperty()
  totalEthValueOfEthLoans: number;

  @Expose()
  @ApiProperty()
  totalUsdValueOfUsdLoans: number;

  @Expose()
  @ApiProperty()
  totalInterestEthOfEthLoans: number;

  @Expose()
  @ApiProperty()
  totalInterestUsdOfUsdLoans: number;

  @Expose()
  @ApiProperty()
  totalPrincipalEthOfEthLoans: number;

  @Expose()
  @ApiProperty()
  totalPrincipalUsdOfUsdLoans: number;
}
