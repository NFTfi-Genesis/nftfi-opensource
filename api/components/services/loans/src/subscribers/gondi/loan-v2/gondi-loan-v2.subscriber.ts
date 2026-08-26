import { EventHandler } from '@nftfi.api/modules/ethers-observer';
import { LogArgs, Subscriber, Contract, EmittedAt, TxHash } from '@nftfi.api/modules/ethers-observer/decorators';
import { GondiLoanService } from '../gondi-loan.service';
import { GondiLoanV2Contract } from './gondi-loan-v2.contract';
import type {
  LoanV2LiquidatedPayload,
  LoanV2RepaidPayload,
  LoanV2RefinancedPayload,
  LoanV2StartedPayload
} from './gondi-loan-v2.types';

@Subscriber(GondiLoanV2Contract)
export class GondiLoanV2Subscriber {
  constructor(private readonly loanService: GondiLoanService) {}

  @EventHandler(GondiLoanV2Contract.Event.Started)
  async onLoanStarted(
    @Contract() contract: GondiLoanV2Contract,
    @LogArgs() payload: LoanV2StartedPayload,
    @EmittedAt() emittedAt: Date,
    @TxHash() transactionHash: string
  ): Promise<void> {
    await this.loanService.create(
      contract,
      {
        borrower: payload.borrower,
        startTime: payload.loan.startTime,
        duration: payload.loan.duration,
        nftCollateralAddress: payload.loan.nftCollateralAddress,
        nftCollateralTokenId: payload.loan.nftCollateralTokenId,
        principalAddress: payload.loan.principalAddress,
        principalAmount: payload.loan.principalAmount,
        feeAmount: payload.fee,
        sources: payload.loan.source.map(p => ({
          lender: p.lender,
          aprBps: p.aprBps,
          principalAmount: p.principalAmount,
          accruedInterest: p.accruedInterest
        })),
        loanId: payload.loanId
      },
      emittedAt,
      transactionHash
    );
  }

  @EventHandler(GondiLoanV2Contract.Event.Refinanced)
  async onLoanRefinanced(
    @Contract() contract: GondiLoanV2Contract,
    @LogArgs() payload: LoanV2RefinancedPayload,
    @EmittedAt() emittedAt: Date,
    @TxHash() transactionHash: string
  ): Promise<void> {
    await this.loanService.refinance(
      contract,
      {
        borrower: payload.loan.borrower,
        startTime: payload.loan.startTime,
        duration: payload.loan.duration,
        nftCollateralAddress: payload.loan.nftCollateralAddress,
        nftCollateralTokenId: payload.loan.nftCollateralTokenId,
        principalAddress: payload.loan.principalAddress,
        principalAmount: payload.loan.principalAmount,
        feeAmount: payload.fee,
        sources: payload.loan.source.map(p => ({
          lender: p.lender,
          aprBps: p.aprBps,
          principalAmount: p.principalAmount,
          accruedInterest: p.accruedInterest
        })),
        newLoanId: payload.newLoanId,
        oldLoanId: payload.oldLoanId
      },
      emittedAt,
      transactionHash
    );
  }

  @EventHandler(GondiLoanV2Contract.Event.Repaid)
  async onLoanRepaid(
    @Contract() contract: GondiLoanV2Contract,
    @LogArgs() payload: LoanV2RepaidPayload,
    @EmittedAt() emittedAt: Date,
    @TxHash() transactionHash: string
  ): Promise<void> {
    await this.loanService.repay(contract, payload, emittedAt, transactionHash);
  }

  @EventHandler(GondiLoanV2Contract.Event.Liquidated)
  async onLoanLiquidated(
    @Contract() contract: GondiLoanV2Contract,
    @LogArgs() payload: LoanV2LiquidatedPayload,
    @EmittedAt() emittedAt: Date,
    @TxHash() transactionHash: string
  ): Promise<void> {
    await this.loanService.liquidate(contract, payload, emittedAt, transactionHash);
  }

  @EventHandler(GondiLoanV2Contract.Event.Foreclosed)
  async onLoanForeclosed(
    @Contract() contract: GondiLoanV2Contract,
    @LogArgs() payload: LoanV2LiquidatedPayload,
    @EmittedAt() emittedAt: Date,
    @TxHash() transactionHash: string
  ): Promise<void> {
    await this.loanService.liquidate(contract, payload, emittedAt, transactionHash);
  }
}
