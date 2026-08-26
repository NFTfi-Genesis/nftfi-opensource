import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';

import { LoanV01QueryDto } from './dtos';

@Controller('/loans')
@ApiTags()
@ApiSecurity('api_key')
export class LoanController {
  @Get()
  @HttpCode(HttpStatus.GONE)
  @ApiResponse({ status: HttpStatus.GONE, description: 'Gone - This endpoint is no longer available' })
  async handleGet(@Query() _query: LoanV01QueryDto): Promise<{ message: string }> {
    return { message: 'This endpoint is deprecated' };
  }
}
