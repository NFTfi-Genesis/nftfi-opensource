import * as express from 'express';
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Response,
  SerializeOptions,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { CacheKey, CacheTTL } from '@nestjs/cache-manager';
import {
  ApiHeader,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse
} from '@nestjs/swagger';
import { ApiKey } from '@nftfi.api/core/decorators';
import { ApiPaginationHeaders, HttpResponseHeader, ResponseErrorsDto } from '@nftfi.api/core/dtos';
import { HttpCacheInterceptor } from '@nftfi.api/core/interceptors';
import { type AuthTokenPayload, AuthGuard, AuthOptional, DecodedAuthToken } from '@nftfi.api/modules/auth-guard';
import { OfferV1Service } from './offer-v1.service';
import { DraftOfferV1Dto, OfferV1Dto, OfferV1QueryDto, ResponseOfferV1Dto } from './dtos';
import { OfferV1DurationValidationPipe, OfferV1LimitValidationPipe } from './pipes';
import { OffersV1CacheScope } from './offer-v1.types';

const GetCacheTTL = 1000 * 60; // 1 minute

@CacheKey(OffersV1CacheScope)
@Controller('v1/offers')
@ApiTags('v1')
@ApiSecurity('api_key')
export class OfferV1Controller {
  constructor(private readonly offerV1Service: OfferV1Service) {}

  @Get()
  @UseGuards(AuthGuard)
  @AuthOptional()
  @ApiOperation({ operationId: 'OfferV1Controller_handleGet' })
  @ApiHeader({ name: 'Authorization', required: false })
  @ApiHeader({ name: 'X-Api-Key', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ok',
    type: OfferV1Dto,
    isArray: true,
    headers: ApiPaginationHeaders
  })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Validation Error', type: ResponseErrorsDto })
  @CacheTTL(GetCacheTTL)
  @CacheKey('get-many')
  @SerializeOptions({ excludeExtraneousValues: true })
  @UseInterceptors(HttpCacheInterceptor, ClassSerializerInterceptor)
  async handleGet(
    @Query() query: OfferV1QueryDto,
    @DecodedAuthToken() authToken: AuthTokenPayload,
    @ApiKey() apiKey: string,
    @Response({ passthrough: true }) res: express.Response
  ): Promise<OfferV1Dto[]> {
    const [offers, total] = await Promise.all([
      this.offerV1Service.getMany(query, authToken, apiKey),
      this.offerV1Service.count(query, authToken.account)
    ]);
    const dtos = await this.offerV1Service.toDtos(offers);

    res.setHeader(HttpResponseHeader.PaginationPage, query.page.toString());
    res.setHeader(HttpResponseHeader.PaginationLimit, query.limit.toString());
    res.setHeader(HttpResponseHeader.PaginationTotal, total.toString());
    return dtos;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard)
  @AuthOptional()
  @ApiHeader({ name: 'Authorization', required: false })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Created', type: ResponseOfferV1Dto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Unprocessable Entity',
    type: ResponseErrorsDto
  })
  async handlePost(
    @Body(OfferV1DurationValidationPipe, OfferV1LimitValidationPipe) offer: DraftOfferV1Dto,
    @DecodedAuthToken() authToken: AuthTokenPayload
  ): Promise<OfferV1Dto> {
    const entity = await this.offerV1Service.create(offer, authToken.account);
    const [dto] = await this.offerV1Service.toDtos([entity]);
    return dto;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard)
  @ApiOperation({ operationId: 'OfferV1Controller_handleDelete' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'No Content' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ResponseErrorsDto })
  @ApiNotFoundResponse({ description: 'Not Found', type: ResponseErrorsDto })
  async handleDelete(
    @Param('id', ParseIntPipe) id: number,
    @DecodedAuthToken() authToken: AuthTokenPayload
  ): Promise<void> {
    await this.offerV1Service.deleteById(id, authToken.account);
  }
}
