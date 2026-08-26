import { ApiProperty, PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsObject, IsPositive, IsString, Min, ValidateNested } from 'class-validator';
import { IsGreaterThan } from '@nftfi.api/validation';

class OfferTermsLoanInterestDto {
  @Expose()
  @ApiProperty({ type: Boolean })
  @IsBoolean()
  prorated: boolean;

  @Expose()
  @ApiProperty({ type: Number })
  @IsNumber()
  bps: number;
}

export class OfferTermsLoanDto {
  @Expose()
  @ApiProperty({ type: Number })
  @IsNumber()
  duration: number;

  @Expose()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsGreaterThan('principal')
  @ApiProperty({ type: Number })
  repayment: number;

  @Expose()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @ApiProperty({ type: Number })
  principal: number;

  @Expose()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @ApiProperty({ type: Number })
  origination?: number;

  @Expose()
  @ApiProperty({ type: Number })
  apr: number;

  @Expose()
  @ApiProperty({ type: Number })
  effectiveApr?: number;

  @Expose()
  @ApiProperty({ type: Number })
  cost: number;

  @Expose()
  @ApiProperty({ type: String })
  @IsString()
  currency: string;

  @Expose()
  @ApiProperty({ type: Number })
  expiry: number;

  @Expose()
  @Type(() => OfferTermsLoanInterestDto)
  @ApiProperty({ type: OfferTermsLoanInterestDto })
  interest?: OfferTermsLoanInterestDto;

  @Expose()
  @ApiProperty({ type: String })
  unit: string;
}

export class DraftOfferTermsLoanDto extends PickType(OfferTermsLoanDto, [
  'duration',
  'repayment',
  'principal',
  'currency',
  'expiry',
  'interest'
]) {}

export class DraftOfferTypeTermsLoanDto extends PickType(OfferTermsLoanDto, [
  'duration',
  'repayment',
  'principal',
  'origination',
  'currency',
  'expiry',
  'interest'
]) {}

export class OfferTermsDto {
  @Expose()
  @Type(() => OfferTermsLoanDto)
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: OfferTermsLoanDto })
  loan: OfferTermsLoanDto;
}

export class DraftOfferTermsDto {
  @Expose()
  @Type(() => DraftOfferTermsLoanDto)
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: DraftOfferTermsLoanDto })
  loan: DraftOfferTermsLoanDto;
}

export class DraftOfferTypeTermsDto {
  @Expose()
  @Type(() => DraftOfferTypeTermsLoanDto)
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: DraftOfferTypeTermsLoanDto })
  loan: DraftOfferTypeTermsLoanDto;
}
