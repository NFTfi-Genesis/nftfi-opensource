import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketLoan, MarketLoanRepository } from '@nftfi.api/repositories/postgres/market-loan';
import { LoanV1Controller } from './loan-v1.controller';
import { LoanV1Service } from './loan-v1.service';

@Module({
  imports: [TypeOrmModule.forFeature([MarketLoan])],
  controllers: [LoanV1Controller],
  providers: [LoanV1Service, MarketLoanRepository]
})
export class LoanV1Module {}
