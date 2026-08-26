import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ResponseErrorsDto } from '@nftfi.api/core/dtos';
import { httpValidationPipe } from '@nftfi.api/validation';
import { AuthService } from './auth.service';
import { AuthenticateDto, RefreshTokenRequestDto, ResponseTokenDto, TokenDto } from './dtos';

@Controller('/v1/auth')
@ApiTags('auth')
@ApiSecurity('api-key')
@ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad Request', type: ResponseErrorsDto })
@ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Unprocessable Entity', type: ResponseErrorsDto })
export class AuthV1Controller {
  constructor(private readonly authService: AuthService) {}

  @Post('token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'AuthV1Controller_token',
    summary: 'Authenticate via Ethereum signature'
  })
  @ApiBody({ type: AuthenticateDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Authentication successful', type: ResponseTokenDto })
  async authenticate(@Body(httpValidationPipe) dto: AuthenticateDto, @Req() req: Request): Promise<TokenDto> {
    return await this.authService.authenticate(dto, req.ip);
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'AuthV1Controller_refreshToken',
    summary: 'Exchange a refresh token for a new token pair'
  })
  @ApiBody({ type: RefreshTokenRequestDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Token refreshed', type: ResponseTokenDto })
  async refreshToken(@Body(httpValidationPipe) dto: RefreshTokenRequestDto, @Req() req: Request): Promise<TokenDto> {
    return await this.authService.refreshToken(dto.refreshToken, req.ip);
  }
}
