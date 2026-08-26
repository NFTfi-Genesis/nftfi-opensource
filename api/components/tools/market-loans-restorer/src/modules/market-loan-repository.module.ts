import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketLoan, MarketLoanRepository } from '@nftfi.api/repositories/postgres/market-loan';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([MarketLoan])],
  providers: [MarketLoanRepository],
  exports: [MarketLoanRepository]
})
export class MarketLoanRepositoryModule {}
