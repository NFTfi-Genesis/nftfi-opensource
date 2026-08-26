import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ResponsePaginatedBody } from '@nftfi.api/core/dtos';
import { LoanV02Service } from './loan-v02.service';
import { LoanV02Dto, LoanV02GetQueryDto, LoanV02ResponseDto } from './dtos';

@Controller('v0.2/loans')
@ApiTags('v0.2')
@ApiSecurity('api_key')
export class LoanV02Controller {
  constructor(private readonly loanV02Service: LoanV02Service) {}

  @Get()
  @ApiResponse({ status: HttpStatus.OK, description: 'Ok', type: LoanV02ResponseDto })
  async handleGet(@Query() query: LoanV02GetQueryDto): Promise<ResponsePaginatedBody<LoanV02Dto>> {
    const [results, total] = await this.loanV02Service.getMany(query);
    return { results: await this.loanV02Service.toDtos(results), pagination: { total } };
  }
}
