import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class OfferV03FlagDto {
  @Expose()
  @ApiProperty({ type: Boolean })
  underfunded: boolean;
}

export class OfferV03FlagsDto {
  @Expose()
  @Type(() => OfferV03FlagDto)
  @ApiProperty({ type: OfferV03FlagDto })
  balance?: OfferV03FlagDto;
}
