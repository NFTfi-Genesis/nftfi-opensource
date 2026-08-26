import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, ValidateIf } from 'class-validator';
import { Expose } from 'class-transformer';

export class SocialsDto {
  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsString()
  @Expose()
  x?: string;

  @ApiProperty({ type: String, required: false, format: 'email' })
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsEmail()
  @Expose()
  email?: string;

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsString()
  @Expose()
  discord?: string;

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsString()
  @Expose()
  telegram?: string;
}
