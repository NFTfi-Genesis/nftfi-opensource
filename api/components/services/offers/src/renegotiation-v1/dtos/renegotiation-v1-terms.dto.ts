import { ApiProperty, PickType } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { IsDate, IsInt, IsObject, IsPositive, ValidateNested } from 'class-validator';
import { IsFutureDate, IsWeiString } from '@nftfi.api/validation';

export class RenegotiationV1TermsLoanDto {
  @Expose()
  @IsInt()
  @IsPositive()
  @ApiProperty({ type: Number, description: 'New loan duration in seconds' })
  duration: number;

  @Expose()
  @IsWeiString()
  @ApiProperty({ type: String, description: 'Renegotiation fee in wei' })
  renegotiationFee: string;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : value), { toClassOnly: true })
  @IsDate()
  @IsFutureDate()
  @ApiProperty({ type: Date, description: 'ISO 8601 date string — lender signature validity (or row freshness)' })
  expiresAt: Date;
}

export class DraftRenegotiationV1TermsLoanDto extends PickType(RenegotiationV1TermsLoanDto, [
  'duration',
  'renegotiationFee',
  'expiresAt'
]) {}

export class RenegotiationV1TermsDto {
  @Expose()
  @Type(() => RenegotiationV1TermsLoanDto)
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: RenegotiationV1TermsLoanDto })
  loan: RenegotiationV1TermsLoanDto;
}

export class DraftRenegotiationV1TermsDto {
  @Expose()
  @Type(() => DraftRenegotiationV1TermsLoanDto)
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: DraftRenegotiationV1TermsLoanDto })
  loan: DraftRenegotiationV1TermsLoanDto;
}
