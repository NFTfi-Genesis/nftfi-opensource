import { IntersectionType, OmitType } from '@nestjs/swagger';
import { SortingDto } from '@nftfi.api/validation';
import { AnalyticsSortBy } from '@nftfi.api/repositories/postgres/market-loan';
import { AnalyticsV1PaginatedQueryDto } from './analytics-v1-paginated-query.dto';

export class StatsByLenderPaginatedQueryDto extends OmitType(AnalyticsV1PaginatedQueryDto, ['lender']) {}

export class StatsByLenderQueryDto extends IntersectionType(
  StatsByLenderPaginatedQueryDto,
  SortingDto<AnalyticsSortBy>
) {}
