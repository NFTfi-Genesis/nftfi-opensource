import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class LoanV01QueryDto {
  @Expose()
  @IsString()
  @ApiProperty({ type: String })
  counterparty: string;

  @Expose()
  @IsString()
  @ApiProperty({ type: String })
  accountAddress: string;

  @Expose()
  @IsString()
  @IsOptional()
  @ApiProperty({ type: String, required: false })
  status?: string;
}
