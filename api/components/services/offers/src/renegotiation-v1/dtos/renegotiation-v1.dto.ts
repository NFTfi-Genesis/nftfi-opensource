import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  IsEnum,
  IsEthereumAddress,
  IsInt,
  IsNumberString,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested
} from 'class-validator';
import { RenegotiationParty, RenegotiationStatus } from '@nftfi.api/repositories/postgres/renegotiation';
import { DraftRenegotiationV1TermsDto, RenegotiationV1TermsDto } from './renegotiation-v1-terms.dto';

export class RenegotiationV1AddressDto {
  @Expose()
  @IsString()
  @ApiProperty({ type: String })
  address: string;
}

export class RenegotiationV1LenderDto extends RenegotiationV1AddressDto {
  @Expose()
  @IsString()
  @IsOptional()
  @ApiProperty({ type: String, required: false, description: 'Lender nonce, null on accepted history rows' })
  nonce: string | null;
}

export class DraftRenegotiationV1LenderDto extends RenegotiationV1AddressDto {
  @Expose()
  @IsString()
  @ApiProperty({ type: String, description: 'Lender nonce' })
  nonce: string;
}

export class RenegotiationV1LoanRefDto {
  @Expose()
  @IsNumberString()
  @ApiProperty({ type: String })
  id: string;

  @Expose()
  @IsString()
  @ApiProperty({ type: String, description: 'On-chain contract name, e.g. v2-3.loan.fixed' })
  contract: string;
}

export class DraftRenegotiationV1LoanRefDto {
  @Expose()
  @IsInt()
  @IsPositive()
  @ApiProperty({ type: Number, description: 'MarketLoan entity primary key' })
  id: number;
}

export class RenegotiationV1Dto {
  @Expose()
  @IsInt()
  @ApiProperty({ type: Number, readOnly: true })
  id: number;

  @Expose()
  @Type(() => RenegotiationV1LoanRefDto)
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: RenegotiationV1LoanRefDto })
  loan: RenegotiationV1LoanRefDto;

  @Expose()
  @IsEnum(RenegotiationStatus)
  @ApiProperty({ enum: RenegotiationStatus, readOnly: true })
  status: RenegotiationStatus;

  @Expose()
  @IsEnum(RenegotiationParty)
  @ApiProperty({ enum: RenegotiationParty })
  party: RenegotiationParty;

  @Expose()
  @Type(() => RenegotiationV1LenderDto)
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: RenegotiationV1LenderDto })
  lender: RenegotiationV1LenderDto;

  @Expose()
  @Type(() => RenegotiationV1AddressDto)
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: RenegotiationV1AddressDto })
  borrower: RenegotiationV1AddressDto;

  @Expose()
  @Type(() => RenegotiationV1TermsDto)
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: RenegotiationV1TermsDto })
  terms: RenegotiationV1TermsDto;

  @Expose()
  @IsString()
  @IsOptional()
  @ApiProperty({ type: String, required: false })
  signature: string | null;

  @Expose()
  @IsString()
  @IsOptional()
  @ApiProperty({ type: String, required: false })
  message: string | null;

  @Expose()
  @Type(() => Date)
  @ApiProperty({ type: Date, readOnly: true })
  createdAt: Date;
}

export class DraftRenegotiationV1Dto extends OmitType(RenegotiationV1Dto, [
  'id',
  'loan',
  'status',
  'party',
  'lender',
  'borrower',
  'terms',
  'signature',
  'message',
  'createdAt'
] as const) {
  @Expose()
  @Type(() => DraftRenegotiationV1LoanRefDto)
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: DraftRenegotiationV1LoanRefDto })
  loan: DraftRenegotiationV1LoanRefDto;

  @Expose()
  @Type(() => DraftRenegotiationV1LenderDto)
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: DraftRenegotiationV1LenderDto })
  lender: DraftRenegotiationV1LenderDto;

  @Expose()
  @Type(() => DraftRenegotiationV1TermsDto)
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: DraftRenegotiationV1TermsDto })
  terms: DraftRenegotiationV1TermsDto;

  @Expose()
  @IsString()
  @ApiProperty({ type: String, description: 'EIP-712 lender signature' })
  signature: string;

  @Expose()
  @IsString()
  @IsOptional()
  @ApiProperty({ type: String, required: false })
  message: string | null;
}

export class RenegotiationV1PartyAddressDto {
  @Expose()
  @IsEthereumAddress()
  @ApiProperty({ type: String })
  partyAddress: string;
}
