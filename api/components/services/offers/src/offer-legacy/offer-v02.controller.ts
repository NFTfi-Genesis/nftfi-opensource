import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiHeader, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKey } from '@nftfi.api/core/decorators';
import { type AuthTokenPayload, DecodedAuthToken } from '@nftfi.api/modules/auth-guard';
import { DraftOfferDto } from './dtos';

@Controller('v0.2/offers')
@ApiTags('v0.2')
@ApiSecurity('api_key')
export class OfferV02Controller {
  @Get()
  @HttpCode(HttpStatus.GONE)
  @ApiHeader({ name: 'Authorization', required: false })
  @ApiHeader({ name: 'X-Api-Key', required: false })
  @ApiResponse({ status: HttpStatus.GONE, description: 'Gone - This endpoint is no longer available' })
  async handleGet(
    @DecodedAuthToken() _authToken: AuthTokenPayload,
    @ApiKey() _apiKey: string
  ): Promise<{ message: string }> {
    return { message: 'This endpoint is deprecated' };
  }

  @Post()
  @HttpCode(HttpStatus.GONE)
  @ApiResponse({ status: HttpStatus.GONE, description: 'Gone - This endpoint is no longer available' })
  async handlePost(@Body() _offer: DraftOfferDto): Promise<{ message: string }> {
    return { message: 'This endpoint is deprecated' };
  }
}
