import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { MarketLoanProtocol, MarketLoanStatus } from '@nftfi.api/repositories/postgres/market-loan';
import { AssetDto } from '@nftfi.api/facades/assets';

export class LoanV1Dto {
  @Expose()
  @ApiProperty()
  id: number;

  @Expose()
  @ApiProperty()
  loanId: string;

  @Expose()
  @ApiProperty()
  contract: string;

  @Expose()
  @ApiProperty()
  contractName: string;

  @Expose()
  @ApiProperty({ enum: MarketLoanProtocol })
  protocol: MarketLoanProtocol;

  @Expose()
  @ApiProperty({ enum: MarketLoanStatus })
  status: MarketLoanStatus;

  @Expose()
  @ApiProperty({ type: AssetDto, description: 'Collateral asset' })
  @Type(() => AssetDto)
  asset: AssetDto;

  @Expose()
  @ApiProperty()
  borrower: string;

  @Expose()
  @ApiProperty()
  lender: string;

  @Expose()
  @ApiProperty()
  currency: string;

  @Expose()
  @ApiProperty()
  principal: string;

  @Expose()
  @ApiProperty()
  repayment: string;

  @Expose()
  @ApiProperty()
  repaymentMax: string;

  @Expose()
  @ApiProperty()
  interest: string;

  @Expose()
  @ApiProperty()
  originationFee: string;

  @Expose()
  @ApiProperty()
  adminFee: string;

  @Expose()
  @ApiProperty()
  apr: number;

  @Expose()
  @ApiProperty()
  eapr: number;

  @Expose()
  @ApiProperty()
  prorated: boolean;

  @Expose()
  @ApiProperty({ type: Number, description: 'Duration in seconds' })
  duration: number;

  @Expose()
  @ApiProperty()
  startedAt: Date;

  @Expose()
  @ApiProperty({ type: Date, nullable: true })
  dueAt: Date | null;

  @Expose()
  @ApiProperty()
  endedAt: Date | null;
}
