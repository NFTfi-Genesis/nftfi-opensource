import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class LoanV02NftProjectDto {
  @Expose()
  @ApiProperty({ type: String })
  name: string;
}

export class LoanV02NftImageDto {
  @Expose()
  @ApiProperty({ type: String })
  uri: string;
}

export class LoanV02NftDto {
  @Expose()
  @ApiProperty({ type: String })
  id: string;

  @Expose()
  @ApiProperty({ type: String })
  address: string;

  @Expose()
  @ApiProperty({ type: String })
  name: string;

  @Expose()
  @Type(() => LoanV02NftProjectDto)
  @ApiProperty({ type: LoanV02NftProjectDto })
  project: LoanV02NftProjectDto;

  @Expose()
  @Type(() => LoanV02NftImageDto)
  @ApiProperty({ type: LoanV02NftImageDto })
  image: LoanV02NftImageDto;
}
