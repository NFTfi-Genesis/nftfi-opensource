import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKey } from '@nftfi.api/core/decorators';
import { type AuthTokenPayload, DecodedAuthToken, AuthOptional, AuthGuard } from '@nftfi.api/modules/auth-guard';
import { ResponseBody, ResponseErrorsDto, ResponsePaginatedBody } from '@nftfi.api/core/dtos';
import { OfferV03Service } from './offer-v03.service';
import {
  OfferV03Dto,
  DraftOfferV03Dto,
  ResponseOfferV03Dto,
  OfferV03QueryDto,
  PaginatedResponseOfferV03Dto
} from './dtos';

@Controller('v0.3/offers')
@ApiTags('v0.3')
@ApiSecurity('api_key')
export class OfferV03Controller {
  constructor(private readonly offerV03Service: OfferV03Service) {}

  @Get()
  @UseGuards(AuthGuard)
  @AuthOptional()
  @ApiHeader({ name: 'Authorization', required: false })
  @ApiHeader({ name: 'X-Api-Key', required: false })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ok', type: PaginatedResponseOfferV03Dto })
  async handleGet(
    @Query() query: OfferV03QueryDto,
    @DecodedAuthToken() authToken: AuthTokenPayload,
    @ApiKey() apiKey: string
  ): Promise<ResponsePaginatedBody<OfferV03Dto>> {
    const [data, total] = await this.offerV03Service.getMany(query, authToken, apiKey);
    return {
      results: data,
      pagination: { total }
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Created', type: ResponseOfferV03Dto })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Unprocessable Entity',
    type: ResponseErrorsDto
  })
  async handlePost(@Body() offer: DraftOfferV03Dto): Promise<ResponseBody<OfferV03Dto>> {
    return {
      result: await this.offerV03Service.create(offer)
    };
  }
}
