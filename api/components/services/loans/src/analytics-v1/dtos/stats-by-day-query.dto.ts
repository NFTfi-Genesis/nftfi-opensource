import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsOptional, IsString, IsTimeZone } from 'class-validator';
import { AnalyticsV1QueryDto } from './analytics-v1-query.dto';

export class StatsByDayQueryDto extends AnalyticsV1QueryDto {
  @Expose()
  @ApiProperty({
    type: String,
    required: false,
    description: 'IANA timezone (e.g. America/New_York). Defaults to UTC.'
  })
  @IsString()
  @IsTimeZone()
  @IsOptional()
  timezone?: string;
}
