import { Expose } from 'class-transformer';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { AccountDto } from './account.dto';

export class AccountSanctionedDto extends PickType(AccountDto, ['wallet'] as const) {
  @Expose()
  @ApiProperty({ type: Boolean })
  flagged: boolean;
}
