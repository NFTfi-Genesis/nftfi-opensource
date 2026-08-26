import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsEthereumAddress, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Expose, Type } from 'class-transformer';

export enum MultisigType {
  Gnosis = 'gnosis'
}

export class MultisigDto {
  @ApiProperty({ enum: MultisigType, description: 'Multisig wallet type' })
  @IsEnum(MultisigType)
  @IsOptional()
  @Expose()
  type: MultisigType;
}

export class AuthenticateDto {
  @ApiProperty({ type: String, description: 'Consent or terms message that was signed' })
  @IsString()
  @IsNotEmpty()
  @Expose()
  message: string;

  @ApiProperty({ type: String, description: 'Ethereum signature of the message' })
  @IsString()
  @IsNotEmpty()
  @Expose()
  signedMessage: string;

  @ApiProperty({ type: String, description: 'Random nonce included in the signed message' })
  @IsString()
  @IsNotEmpty()
  @Expose()
  nonce: string;

  @ApiProperty({ type: String, description: 'Ethereum wallet address', format: 'ethereum-address' })
  @IsEthereumAddress()
  @Expose()
  accountAddress: string;

  @ApiProperty({ type: MultisigDto, required: false, description: 'Optional multisig configuration' })
  @ValidateNested()
  @Type(() => MultisigDto)
  @IsOptional()
  @Expose()
  multisig?: MultisigDto;
}
