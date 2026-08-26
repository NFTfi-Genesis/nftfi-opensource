import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { IsEthereumAddress } from 'class-validator';
import { transformers } from '@nftfi.api/validation';

export class StatsByWalletQueryDto {
  @Expose()
  @ApiProperty({ type: String, description: 'Wallet address' })
  @Transform(transformers.toLowerCase)
  @IsEthereumAddress()
  wallet: string;
}
