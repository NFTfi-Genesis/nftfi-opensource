import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ProtocolBreakdownDto {
  @Expose()
  @ApiProperty()
  protocol: string;

  @Expose()
  @ApiProperty()
  total: number;
}
