import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketLoan, MarketLoanRepository } from '@nftfi.api/repositories/postgres/market-loan';
import { LoanController } from './loan.controller';
import { LoanV01Controller } from './loan-v01.controller';
import { LoanV02Controller } from './loan-v02.controller';
import { LoanV02Service } from './loan-v02.service';

@Module({
  imports: [TypeOrmModule.forFeature([MarketLoan])],
  controllers: [LoanController, LoanV01Controller, LoanV02Controller],
  providers: [LoanV02Service, MarketLoanRepository]
})
export class LoanLegacyModule {}
