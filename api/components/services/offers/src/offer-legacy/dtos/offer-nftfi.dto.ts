import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsNumberString, IsString, ValidateNested } from 'class-validator';

class OfferNftfiContractDto {
  @Expose()
  @ApiProperty({ type: String })
  @IsString()
  name: string;
}

class OfferNftfiFeeDto {
  @Expose()
  @ApiProperty({ type: Number })
  @IsNumberString()
  bps: number;
}

export class OfferNftfiDto {
  @Expose()
  @Type(() => OfferNftfiContractDto)
  @ValidateNested()
  @ApiProperty({ type: OfferNftfiContractDto })
  contract: OfferNftfiContractDto;

  @Expose()
  @Type(() => OfferNftfiFeeDto)
  @ValidateNested()
  @ApiProperty({ type: OfferNftfiFeeDto })
  fee: OfferNftfiFeeDto;
}
