import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ResponseBody } from '@nftfi.api/core/dtos';
import { OfferCountDto, OfferCountQueryDto, ResponseOffersCountDto } from './dtos';
import { OfferCountV01Service } from './offer-count-v01.service';

@Controller('/v0.1/offers-count')
@ApiTags('v0.1')
@ApiSecurity('api_key')
export class OfferCountV01Controller {
  constructor(private readonly offerCountV01Service: OfferCountV01Service) {}

  @Get()
  @ApiResponse({ status: HttpStatus.OK, description: 'Ok', type: ResponseOffersCountDto })
  async handlerGet(@Query() query: OfferCountQueryDto): Promise<ResponseBody<OfferCountDto>> {
    return {
      result: await this.offerCountV01Service.getOfferCount(query)
    };
  }
}
