import { IntersectionType } from '@nestjs/swagger';
import { PaginationDto } from '@nftfi.api/validation';
import { AnalyticsV1QueryDto } from './analytics-v1-query.dto';

export class AnalyticsV1PaginatedQueryDto extends IntersectionType(AnalyticsV1QueryDto, PaginationDto) {}
