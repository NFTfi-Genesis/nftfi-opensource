import { ApiProperty, PickType } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { IsBoolean, IsDate, IsInt, IsNumber, IsObject, IsPositive, IsString, ValidateNested } from 'class-validator';
import { IsFutureDate, IsGreaterThan, IsWeiString } from '@nftfi.api/validation';

export class OfferV1TermsLoanDto {
  @Expose()
  @IsInt()
  @IsPositive()
  @ApiProperty({ type: Number })
  duration: number;

  @Expose()
  @IsWeiString()
  @ApiProperty({ type: String })
  principal: string;

  @Expose()
  @IsWeiString()
  @IsGreaterThan('principal')
  @ApiProperty({ type: String })
  repayment: string;

  @Expose()
  @IsWeiString()
  @ApiProperty({ type: String })
  origination: string;

  @Expose()
  @IsString()
  @ApiProperty({ type: String })
  currency: string;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : value), { toClassOnly: true })
  @IsDate()
  @IsFutureDate()
  @ApiProperty({ type: Date, description: 'ISO 8601 date string' })
  expiresAt: Date;

  @Expose()
  @IsNumber()
  @ApiProperty({ type: Number, readOnly: true })
  apr: number;

  @Expose()
  @IsNumber()
  @ApiProperty({ type: Number, description: 'Effective APR including origination fee', readOnly: true })
  eapr: number;

  @Expose()
  @IsBoolean()
  @ApiProperty({ type: Boolean })
  prorated: boolean;

  @Expose()
  @ApiProperty({ type: String, readOnly: true })
  unit: string;
}

export class DraftOfferV1TermsLoanDto extends PickType(OfferV1TermsLoanDto, [
  'duration',
  'principal',
  'repayment',
  'origination',
  'currency',
  'expiresAt',
  'prorated'
]) {}

export class OfferV1TermsDto {
  @Expose()
  @Type(() => OfferV1TermsLoanDto)
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: OfferV1TermsLoanDto })
  loan: OfferV1TermsLoanDto;
}

export class DraftOfferV1TermsDto {
  @Expose()
  @Type(() => DraftOfferV1TermsLoanDto)
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: DraftOfferV1TermsLoanDto })
  loan: DraftOfferV1TermsLoanDto;
}
