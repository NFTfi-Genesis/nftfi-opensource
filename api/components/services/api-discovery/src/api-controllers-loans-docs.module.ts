import { Module } from '@nestjs/common';
import * as Loans from '@nftfi.api/services/loans';

@Module({
  controllers: [Loans.LoanController, Loans.LoanV01Controller, Loans.LoanV02Controller],
  providers: [{ provide: Loans.LoanV02Service, useValue: {} }]
})
export class ApiControllersLoansDocsModule {}
