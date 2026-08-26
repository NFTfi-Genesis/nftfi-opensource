import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketLoan, MarketLoanRepository } from '@nftfi.api/repositories/postgres/market-loan';
import { NftfiSmartNftId, NftfiSmartNftIdRepository } from '@nftfi.api/repositories/postgres/nftfi-smart-nft-id';
import { NftfiLoanModule } from './nftfi';
import { LoanHelperService } from './loan-helper.service';
import { GondiLoanModule } from './gondi/gondi-loan.module';
import { ArcadeLoanModule } from './arcade/arcade-loan.module';
import { BlurLoanModule } from './blur/blur-loan.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([MarketLoan, NftfiSmartNftId]),
    NftfiLoanModule,
    GondiLoanModule,
    ArcadeLoanModule,
    BlurLoanModule
  ],
  providers: [LoanHelperService, MarketLoanRepository, NftfiSmartNftIdRepository],
  exports: [LoanHelperService, MarketLoanRepository, NftfiSmartNftIdRepository]
})
export class LoanSubscribersModule {}
