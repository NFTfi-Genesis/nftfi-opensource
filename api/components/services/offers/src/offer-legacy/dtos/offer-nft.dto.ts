import { ApiProperty, PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsString } from 'class-validator';

class OfferNftProjectDto {
  @Expose()
  @ApiProperty({ type: String })
  name: string;
}

export class OfferNftDto {
  @Expose()
  @ApiProperty({ type: String })
  id: string;

  @Expose()
  @ApiProperty({ type: String })
  @IsString()
  address: string;

  @Expose()
  @ApiProperty({ type: String, required: false })
  name?: string;

  @Expose()
  @ApiProperty({ type: OfferNftProjectDto })
  @Type(() => OfferNftProjectDto)
  project: OfferNftProjectDto;
}

export class DraftOfferNftDto extends PickType(OfferNftDto, ['id', 'address']) {}
