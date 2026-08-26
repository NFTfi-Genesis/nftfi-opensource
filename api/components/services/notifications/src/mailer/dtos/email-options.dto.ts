import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class EmailIOptions {
  @Expose()
  @IsBoolean()
  @IsOptional()
  @ApiProperty({ type: Boolean, default: false })
  resend?: boolean;
}
