import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { getResponseBodyDto } from '@nftfi.api/core/dtos';

export class TokenDto {
  @ApiProperty({ type: String, description: 'JWT access token (expires in 15 minutes)' })
  @Expose()
  token: string;

  @ApiProperty({ type: String, description: 'Refresh token (expires in 31 days)' })
  @Expose()
  refreshToken: string;
}

export const ResponseTokenDto = getResponseBodyDto(TokenDto);
