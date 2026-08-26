import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { IsArray, IsEthereumAddress, IsNumber, IsNumberString, IsOptional, IsPositive } from 'class-validator';
import { transformers } from '@nftfi.api/validation';

export class OfferV03TermsQueryDto {
  @Expose()
  @Transform(transformers.toNumber)
  @IsNumber()
  @IsOptional()
  @ApiProperty({ type: Number, required: false })
  termsAprLte: number;

  @Expose()
  @Transform(transformers.toNumber)
  @IsNumber()
  @IsOptional()
  @ApiProperty({ type: Number, required: false })
  termsEffectiveAprLte: number;

  @Expose()
  @ApiProperty({ type: String, required: false })
  @IsNumberString()
  @IsOptional()
  termsDuration: string;

  @Expose()
  @Transform(transformers.toArrayOfNumbers)
  @ApiProperty({
    type: String,
    required: false,
    example: '10000,20000',
    description: 'A comma-separated list of numbers, e.g. "10000,20000".'
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsPositive({ each: true })
  @IsOptional()
  termsDurationNin: number[];

  @Expose()
  @Transform(transformers.toLowerCase)
  @IsEthereumAddress()
  @IsOptional()
  @ApiProperty({ type: String, required: false })
  termsCurrencyAddress: string;
}
