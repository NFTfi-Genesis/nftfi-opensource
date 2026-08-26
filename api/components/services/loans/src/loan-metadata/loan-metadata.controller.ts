import { Controller, Get, Header, HttpStatus, Param, Redirect, UseInterceptors } from '@nestjs/common';
import { CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HttpCacheInterceptor } from '@nftfi.api/core/interceptors';

import { LoanMetadataService } from './loan-metadata.service';
import { SmartNftType } from './loan-metadata.constants';
import { LoanMetadataDto } from './loan-metadata.dto';
import { LoanMetadataResponse } from './loan-metadata.types';

const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const CACHE_SCOPE = 'loan-metadata';

@Controller('loans/v2')
@ApiTags('metadata')
@CacheKey(CACHE_SCOPE)
export class LoanMetadataController {
  constructor(private readonly loanMetadataService: LoanMetadataService) {}

  @Get('obligation/:chainId/:smartNftId')
  @Header('Cache-Control', 'public, max-age=3600')
  @CacheTTL(CACHE_TTL)
  @UseInterceptors(HttpCacheInterceptor)
  @ApiOperation({ operationId: 'LoanMetadataController_getObligationMetadata' })
  @ApiParam({ name: 'chainId', type: String })
  @ApiParam({ name: 'smartNftId', type: String })
  @ApiResponse({ status: HttpStatus.OK, description: 'Obligation receipt metadata', type: LoanMetadataDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Loan not found' })
  async getObligationMetadata(
    @Param('chainId') chainId: string,
    @Param('smartNftId') smartNftId: string
  ): Promise<LoanMetadataResponse> {
    return this.loanMetadataService.getMetadata(smartNftId, SmartNftType.Obligation);
  }

  @Get('promissory/:chainId/:smartNftId')
  @Header('Cache-Control', 'public, max-age=3600')
  @CacheTTL(CACHE_TTL)
  @UseInterceptors(HttpCacheInterceptor)
  @ApiOperation({ operationId: 'LoanMetadataController_getPromissoryMetadata' })
  @ApiParam({ name: 'chainId', type: String })
  @ApiParam({ name: 'smartNftId', type: String })
  @ApiResponse({ status: HttpStatus.OK, description: 'Promissory note metadata', type: LoanMetadataDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Loan not found' })
  async getPromissoryMetadata(
    @Param('chainId') chainId: string,
    @Param('smartNftId') smartNftId: string
  ): Promise<LoanMetadataResponse> {
    return this.loanMetadataService.getMetadata(smartNftId, SmartNftType.Promissory);
  }

  @Get('obligation/image/:chainId/:smartNftId')
  @Redirect()
  @ApiOperation({ operationId: 'LoanMetadataController_getObligationImage' })
  @ApiResponse({ status: HttpStatus.FOUND, description: 'Redirect to obligation image' })
  getObligationImage(): { url: string; statusCode: number } {
    return { url: this.loanMetadataService.getImageUrl(SmartNftType.Obligation), statusCode: 302 };
  }

  @Get('promissory/image/:chainId/:smartNftId')
  @Redirect()
  @ApiOperation({ operationId: 'LoanMetadataController_getPromissoryImage' })
  @ApiResponse({ status: HttpStatus.FOUND, description: 'Redirect to promissory image' })
  getPromissoryImage(): { url: string; statusCode: number } {
    return { url: this.loanMetadataService.getImageUrl(SmartNftType.Promissory), statusCode: 302 };
  }
}
