import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { Expose } from 'class-transformer';

export class RefreshTokenRequestDto {
  @ApiProperty({ type: String, description: 'Active refresh token to exchange for a new token pair' })
  @IsString()
  @IsNotEmpty()
  @Expose()
  refreshToken: string;
}
