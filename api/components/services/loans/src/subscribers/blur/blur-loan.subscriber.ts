import { EventHandler, Log, LogArgs, EmittedAt, Subscriber, TxHash } from '@nftfi.api/modules/ethers-observer';
import { BlurLoanService } from './blur-loan.service';
import { BlurLoanContract } from './blur-loan.contract';
import type { LoanRefinancedPayload, LoanRepaidPayload, LoanStartedPayload } from './blur-loan.types';

@Subscriber(BlurLoanContract)
export class BlurLoanSubscriber {
  constructor(private readonly loanService: BlurLoanService) {}

  @EventHandler(BlurLoanContract.Event.Created)
  async onLoanCreated(
    @Log('address') contract: string,
    @TxHash() txHash: string,
    @EmittedAt() emittedAt: Date,
    @LogArgs() payload: LoanStartedPayload
  ): Promise<void> {
    await this.loanService.create(contract, txHash, emittedAt, payload);
  }

  @EventHandler(BlurLoanContract.Event.StartAuction)
  async onLoanDefaulting(
    @Log('address') contract: string,
    @TxHash() txHash: string,
    @EmittedAt() emittedAt: Date,
    @LogArgs() payload: { lienId: string }
  ): Promise<void> {
    await this.loanService.defaulting(contract, txHash, emittedAt, payload.lienId);
  }

  @EventHandler(BlurLoanContract.Event.Refinanced)
  async onLoanRefinanced(
    @Log('address') contract: string,
    @TxHash() txHash: string,
    @EmittedAt() emittedAt: Date,
    @LogArgs() payload: LoanRefinancedPayload
  ): Promise<void> {
    await this.loanService.refinance(contract, emittedAt, payload);
  }

  @EventHandler(BlurLoanContract.Event.Repaid)
  async onLoanRepaid(
    @Log('address') contract: string,
    @TxHash() txHash: string,
    @EmittedAt() emittedAt: Date,
    @LogArgs() payload: LoanRepaidPayload
  ): Promise<void> {
    await this.loanService.repay(contract, txHash, emittedAt, payload.lienId);
  }

  @EventHandler(BlurLoanContract.Event.Liquidated)
  async onLoanLiquidated(
    @Log('address') contract: string,
    @TxHash() txHash: string,
    @EmittedAt() emittedAt: Date,
    @LogArgs() payload: { lienId: string }
  ): Promise<void> {
    await this.loanService.liquidate(contract, txHash, emittedAt, payload.lienId);
  }
}
