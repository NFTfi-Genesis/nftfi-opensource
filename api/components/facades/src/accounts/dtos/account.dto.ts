import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsEmail, IsEnum, IsEthereumAddress, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CommsFrequency } from '@nftfi.api/repositories/postgres/account';
import { SocialsDto } from './socials.dto';

export class CommunicationsFrequencyDto {
  @ApiProperty({ enum: CommsFrequency })
  @IsEnum(CommsFrequency)
  @Expose()
  frequency: CommsFrequency;
}

export class AccountSocialsDto extends OmitType(SocialsDto, ['email']) {}

export class CommunicationsDto {
  @ApiProperty({ type: CommunicationsFrequencyDto })
  @ValidateNested()
  @Type(() => CommunicationsFrequencyDto)
  @Expose()
  refi: CommunicationsFrequencyDto;

  @ApiProperty({ type: CommunicationsFrequencyDto })
  @ValidateNested()
  @Type(() => CommunicationsFrequencyDto)
  @Expose()
  maturity: CommunicationsFrequencyDto;

  @ApiProperty({ type: CommunicationsFrequencyDto })
  @ValidateNested()
  @Type(() => CommunicationsFrequencyDto)
  @Expose()
  liquidity: CommunicationsFrequencyDto;
}

export class AccountDto {
  @ApiProperty({ type: String, format: 'ethereum-address' })
  @IsEthereumAddress()
  @Expose()
  wallet: string;

  @ApiProperty({ type: String, required: false, nullable: true })
  @IsOptional()
  @IsString()
  @Expose()
  username: string | null;

  @ApiProperty({ type: String, required: false, nullable: true, format: 'email' })
  @IsOptional()
  @IsEmail()
  @Expose()
  email: string | null;

  @ApiProperty({ type: AccountSocialsDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => AccountSocialsDto)
  @Expose()
  socials?: AccountSocialsDto;

  @ApiProperty({ type: CommunicationsDto })
  @ValidateNested()
  @Type(() => CommunicationsDto)
  @Expose()
  communications: CommunicationsDto;
}

export class PartialCommunicationsDto extends PartialType(CommunicationsDto) {}

const UpdateAccountBase: new () => Partial<Pick<AccountDto, 'username' | 'email' | 'socials'>> = PartialType(
  PickType(AccountDto, ['username', 'email', 'socials'])
);

export class UpdateAccountDto extends UpdateAccountBase {
  @ApiProperty({ type: PartialCommunicationsDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => PartialCommunicationsDto)
  @Expose()
  communications?: PartialCommunicationsDto;
}
