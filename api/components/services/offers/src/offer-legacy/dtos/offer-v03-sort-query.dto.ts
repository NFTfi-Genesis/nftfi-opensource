import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';

export enum ParamsDirection {
  Asc = 'asc',
  Desc = 'desc'
}

export enum ParamsSort {
  Expiry = 'expiry',
  ContractName = 'contractName',
  Lender = 'lender',
  LoanDuration = 'loanDuration',
  LoanPrincipalAmount = 'loanPrincipalAmount',
  MaximumRepaymentAmount = 'maximumRepaymentAmount',
  OfferDate = 'offerDate',
  Apr = 'apr',
  InterestPercentage = 'interestPercentage',
  EffectiveApr = 'effectiveApr',
  InterestProrated = 'interestProrated'
}

export class OfferV03SortQueryDto {
  @Expose()
  @Transform(({ value }) => value || ParamsSort.OfferDate)
  @IsEnum(ParamsSort)
  @IsOptional()
  @ApiProperty({ enum: ParamsSort, required: false })
  sort: ParamsSort;

  @Expose()
  @Transform(({ value }) => value || ParamsDirection.Desc)
  @IsEnum(ParamsDirection)
  @IsOptional()
  @ApiProperty({ enum: ParamsDirection, required: false })
  direction: ParamsDirection;
}
