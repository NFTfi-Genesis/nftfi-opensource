import { EmittedAt, EventHandler, Log, LogArgs, Subscriber, TxHash } from '@nftfi.api/modules/ethers-observer';
import { ArcadeLoanService } from './arcade-loan.service';
import { ArcadeLoanV3Contract } from './arcade-loan-v3.contract';
import type { LoanPayload, LoanStartedPayload } from './arcade-loan.types';

@Subscriber(ArcadeLoanV3Contract)
export class ArcadeLoanV3Subscriber {
  constructor(private readonly loanService: ArcadeLoanService) {}

  @EventHandler(ArcadeLoanV3Contract.Event.Created)
  async onLoanStarted(
    @Log('address') contract: string,
    @TxHash() txHash: string,
    @LogArgs() payload: LoanStartedPayload
  ): Promise<void> {
    await this.loanService.createV3(contract, txHash, payload);
  }

  @EventHandler(ArcadeLoanV3Contract.Event.Repaid)
  async onLoanRepaid(
    @Log('address') contract: string,
    @TxHash() txHash: string,
    @EmittedAt() emittedAt: Date,
    @LogArgs() payload: LoanPayload
  ): Promise<void> {
    await this.loanService.repay(contract, txHash, emittedAt, payload);
  }

  @EventHandler(ArcadeLoanV3Contract.Event.Liquidated)
  async onLoanLiquidated(
    @Log('address') contract: string,
    @TxHash() txHash: string,
    @EmittedAt() emittedAt: Date,
    @LogArgs() payload: LoanPayload
  ): Promise<void> {
    await this.loanService.liquidate(contract, txHash, emittedAt, payload);
  }
}
