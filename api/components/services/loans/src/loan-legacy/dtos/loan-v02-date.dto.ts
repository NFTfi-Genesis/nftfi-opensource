import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class LoanV02DateDto {
  @Expose()
  @ApiProperty({ type: Date })
  started: Date;

  @Expose()
  @ApiProperty({ type: Date })
  repaid: Date;

  @Expose()
  @ApiProperty({ type: Date })
  due: Date;
}
