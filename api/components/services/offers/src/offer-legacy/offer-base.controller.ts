import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards
} from '@nestjs/common';
import { ApiHeader, ApiParam, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ResponseErrorsDto } from '@nftfi.api/core/dtos';
import { ApiKey } from '@nftfi.api/core/decorators';
import { type AuthTokenPayload, AuthGuard, DecodedAuthToken } from '@nftfi.api/modules/auth-guard';
import { DraftOfferDto } from './dtos';
import { OfferV01Service } from './offer-v01.service';

@Controller('/offers')
@ApiTags()
@ApiSecurity('api_key')
export class OfferController {
  constructor(private readonly offerV01Service: OfferV01Service) {}

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

  @Delete(':offerId')
  @UseGuards(AuthGuard)
  @ApiParam({ name: 'offerId', type: Number })
  @ApiHeader({ name: 'Authorization', required: true })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ok' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad Request', type: ResponseErrorsDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized', type: ResponseErrorsDto })
  async handleDelete(
    @Param('offerId', ParseIntPipe) id: number,
    @DecodedAuthToken() authToken: AuthTokenPayload
  ): Promise<'OK'> {
    await this.offerV01Service.deleteById(id, authToken.account);
    return 'OK';
  }
}
