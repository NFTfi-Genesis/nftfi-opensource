import { ArgNum, Param } from '@discord-nestjs/core';

export class SetPrefixDto {
  @Param({ name: 'prefix', description: 'The new prefix for this bot' })
  @ArgNum(() => ({ position: 0 }))
  prefix: string;
}
