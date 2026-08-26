import { ApiProperty, OmitType } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEthereumAddress,
  ArrayNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  IsNumber
} from 'class-validator';
import { Expose, Transform, Type } from 'class-transformer';
import { transformers } from '@nftfi.api/validation';
import { SocialsDto } from './socials.dto';

export class ContactDto {
  @ApiProperty({ type: Number })
  @IsNumber()
  @Expose()
  id: number;

  @ApiProperty({ type: Date })
  @Expose()
  createdAt: Date;

  @ApiProperty({ type: [String], format: 'ethereum-address' })
  @IsArray()
  @Transform(transformers.toArrayOfChecksummedAddresses)
  @ArrayNotEmpty()
  @IsEthereumAddress({ each: true })
  @Expose()
  wallets: string[];

  @ApiProperty({ type: Boolean })
  @IsBoolean()
  @Expose()
  favourited: boolean;

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsString()
  @Expose()
  name?: string;

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsString()
  @Expose()
  notes?: string;

  @ApiProperty({ type: SocialsDto, required: false })
  @ValidateNested()
  @Type(() => SocialsDto)
  @Expose()
  socials: SocialsDto;
}

export class DraftContactDto extends OmitType(ContactDto, ['id', 'createdAt']) {}
