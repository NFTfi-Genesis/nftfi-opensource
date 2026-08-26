import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketLoan, MarketLoanAnalyticsRepository } from '@nftfi.api/repositories/postgres/market-loan';
import { AnalyticsV1Controller } from './analytics-v1.controller';
import { AnalyticsV1Service } from './analytics-v1.service';

@Module({
  imports: [TypeOrmModule.forFeature([MarketLoan])],
  controllers: [AnalyticsV1Controller],
  providers: [AnalyticsV1Service, MarketLoanAnalyticsRepository]
})
export class AnalyticsV1Module {}
