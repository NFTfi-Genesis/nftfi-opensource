import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ListingPreference } from '@nftfi.api/repositories/postgres/listing';
import { AssetDto } from '@nftfi.api/facades/assets';

export class ListingV1Dto {
  @Expose()
  @ApiProperty()
  id: number;

  @Expose()
  @ApiProperty({ type: AssetDto, description: 'Collateral asset with collection info' })
  @Type(() => AssetDto)
  asset: AssetDto;

  @Expose()
  @ApiProperty()
  borrower: string;

  @Expose()
  @ApiProperty({ nullable: true, description: 'Currency contract address, null = any' })
  currency: string | null;

  @Expose()
  @ApiProperty({ type: Number, description: 'Duration in seconds' })
  duration: number;

  @Expose()
  @ApiProperty({ nullable: true, description: 'Pro-rated interest, null = any' })
  prorated: boolean | null;

  @Expose()
  @ApiProperty({ enum: ListingPreference })
  preference: ListingPreference;

  @Expose()
  @ApiProperty()
  createdAt: Date;
}
