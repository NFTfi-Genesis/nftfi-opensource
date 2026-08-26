import { ArgRange, Param, ParamType } from '@discord-nestjs/core';
import { Transform } from 'class-transformer';

export class SubscribeDto {
  @Param({ name: 'contracts', description: 'NFT contracts to subscribe', type: ParamType.STRING, required: true })
  @ArgRange(() => ({ formPosition: 0 }))
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().split(' ') : value))
  contracts: string[];
}
