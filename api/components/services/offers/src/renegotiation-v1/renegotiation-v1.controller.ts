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
import { ApiPaginationHeaders, HttpResponseHeader, ResponseErrorsDto } from '@nftfi.api/core/dtos';
import { type AuthTokenPayload, AuthGuard, AuthOptional, DecodedAuthToken } from '@nftfi.api/modules/auth-guard';
import { RenegotiationV1Service } from './renegotiation-v1.service';
import { DraftRenegotiationV1Dto, RenegotiationV1Dto, RenegotiationV1QueryDto } from './dtos';
import { RenegotiationV1DurationValidationPipe, RenegotiationV1OfferValidationPipe } from './pipes';

@Controller('v1/renegotiations')
@ApiTags('v1')
@ApiSecurity('api_key')
export class RenegotiationV1Controller {
  constructor(private readonly renegotiationService: RenegotiationV1Service) {}

  @Get()
  @UseGuards(AuthGuard)
  @AuthOptional()
  @ApiOperation({ operationId: 'RenegotiationV1Controller_handleGet' })
  @ApiHeader({ name: 'Authorization', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ok',
    type: RenegotiationV1Dto,
    isArray: true,
    headers: ApiPaginationHeaders
  })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Validation Error', type: ResponseErrorsDto })
  @SerializeOptions({ excludeExtraneousValues: true })
  @UseInterceptors(ClassSerializerInterceptor)
  async handleGet(
    @Query() query: RenegotiationV1QueryDto,
    @Response({ passthrough: true }) res: express.Response
  ): Promise<RenegotiationV1Dto[]> {
    const [entities, total] = await Promise.all([
      this.renegotiationService.getMany(query),
      this.renegotiationService.count(query)
    ]);
    res.setHeader(HttpResponseHeader.PaginationPage, query.page.toString());
    res.setHeader(HttpResponseHeader.PaginationLimit, query.limit.toString());
    res.setHeader(HttpResponseHeader.PaginationTotal, total.toString());
    return this.renegotiationService.toDtos(entities);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @AuthOptional()
  @ApiOperation({ operationId: 'RenegotiationV1Controller_handleGetById' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ok', type: RenegotiationV1Dto })
  @ApiNotFoundResponse({ description: 'Not Found', type: ResponseErrorsDto })
  @SerializeOptions({ excludeExtraneousValues: true })
  @UseInterceptors(ClassSerializerInterceptor)
  async handleGetById(@Param('id', ParseIntPipe) id: number): Promise<RenegotiationV1Dto> {
    const entity = await this.renegotiationService.getById(id);
    const [dto] = await this.renegotiationService.toDtos([entity]);
    return dto;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard)
  @ApiOperation({ operationId: 'RenegotiationV1Controller_handlePost' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Created', type: RenegotiationV1Dto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ResponseErrorsDto })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Unprocessable Entity',
    type: ResponseErrorsDto
  })
  @SerializeOptions({ excludeExtraneousValues: true })
  @UseInterceptors(ClassSerializerInterceptor)
  async handlePost(
    @Body(RenegotiationV1DurationValidationPipe, RenegotiationV1OfferValidationPipe)
    body: DraftRenegotiationV1Dto
  ): Promise<RenegotiationV1Dto> {
    const entity = await this.renegotiationService.create(body);
    const [dto] = await this.renegotiationService.toDtos([entity]);
    return dto;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard)
  @ApiOperation({ operationId: 'RenegotiationV1Controller_handleDelete' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'No Content' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ResponseErrorsDto })
  @ApiNotFoundResponse({ description: 'Not Found', type: ResponseErrorsDto })
  async handleDelete(
    @Param('id', ParseIntPipe) id: number,
    @DecodedAuthToken() authToken: AuthTokenPayload
  ): Promise<void> {
    await this.renegotiationService.deleteById(id, authToken.account);
  }
}
