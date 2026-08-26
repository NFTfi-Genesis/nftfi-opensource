import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class LoanV02NftfiContractDto {
  @Expose()
  @ApiProperty({ type: String })
  name: string;
}

export class LoanV02NftfiDto {
  @Expose()
  @Type(() => LoanV02NftfiContractDto)
  @ApiProperty({ type: LoanV02NftfiContractDto })
  contract: LoanV02NftfiContractDto;
}
