import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { IsEnum, IsEthereumAddress, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { transformers } from '@nftfi.api/validation';
import { ListingPreference } from '@nftfi.api/repositories/postgres/listing';

export class ListingV1UpdateBodyDto {
  @Expose()
  @ApiProperty({ type: Number, description: 'Duration in seconds' })
  @IsNumber()
  duration: number;

  @Expose()
  @ApiProperty({ nullable: true, description: 'Currency contract address, null = any' })
  @Transform(transformers.toLowerCase)
  @IsEthereumAddress()
  @IsOptional()
  currency: string | null;

  @Expose()
  @ApiProperty({ nullable: true, description: 'Pro-rated interest, null = any' })
  @IsBoolean()
  @IsOptional()
  prorated: boolean | null;

  @Expose()
  @ApiProperty({ enum: ListingPreference })
  @IsEnum(ListingPreference)
  preference: ListingPreference;
}
