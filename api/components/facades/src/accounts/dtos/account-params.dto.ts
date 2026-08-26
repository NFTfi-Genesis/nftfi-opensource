import { Expose, Transform } from 'class-transformer';
import { IsEthereumAddress } from 'class-validator';
import { transformers } from '@nftfi.api/validation';

export class AccountParamsDto {
  @Expose()
  @IsEthereumAddress()
  @Transform(transformers.toLowerCase)
  address: string;
}
