import { EventHandler } from '@nftfi.api/modules/ethers-observer';
import { LogArgs, Subscriber, Contract, EmittedAt, TxHash } from '@nftfi.api/modules/ethers-observer/decorators';
import { GondiLoanService } from '../gondi-loan.service';
import { GondiLoanV1Contract } from './gondi-loan-v1.contract';
import type {
  LoanV1LiquidatedPayload,
  LoanV1RefinancedPayload,
  LoanV1RepaidPayload,
  LoanV1StartedPayload
} from './gondi-loan-v1.types';

@Subscriber(GondiLoanV1Contract)
export class GondiLoanV1Subscriber {
  constructor(private readonly loanService: GondiLoanService) {}

  @EventHandler(GondiLoanV1Contract.Event.Started)
  async onLoanStarted(
    @Contract() contract: GondiLoanV1Contract,
    @LogArgs() payload: LoanV1StartedPayload,
    @EmittedAt() emittedAt: Date,
    @TxHash() transactionHash: string
  ): Promise<void> {
    await this.loanService.create(
      contract,
      {
        borrower: payload.loan.borrower,
        startTime: payload.loan.startTime,
        duration: payload.loan.duration,
        nftCollateralAddress: payload.loan.nftCollateralAddress,
        nftCollateralTokenId: payload.loan.nftCollateralTokenId,
        principalAddress: payload.loan.principalAddress,
        principalAmount: payload.loan.principalAmount,
        feeAmount: payload.fee || '0',
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

  @EventHandler(GondiLoanV1Contract.Event.Refinanced)
  async onLoanRefinanced(
    @Contract() contract: GondiLoanV1Contract,
    @LogArgs() payload: LoanV1RefinancedPayload,
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
        feeAmount: payload.fee || '0',
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

  @EventHandler(GondiLoanV1Contract.Event.Repaid)
  async onLoanRepaid(
    @Contract() contract: GondiLoanV1Contract,
    @LogArgs() payload: LoanV1RepaidPayload,
    @EmittedAt() emittedAt: Date,
    @TxHash() transactionHash: string
  ): Promise<void> {
    await this.loanService.repay(contract, payload, emittedAt, transactionHash);
  }

  @EventHandler(GondiLoanV1Contract.Event.Liquidated)
  async onLoanLiquidated(
    @Contract() contract: GondiLoanV1Contract,
    @LogArgs() payload: LoanV1LiquidatedPayload,
    @EmittedAt() emittedAt: Date,
    @TxHash() transactionHash: string
  ): Promise<void> {
    await this.loanService.liquidate(contract, payload, emittedAt, transactionHash);
  }

  @EventHandler(GondiLoanV1Contract.Event.Foreclosed)
  async onLoanForeclosed(
    @Contract() contract: GondiLoanV1Contract,
    @LogArgs() payload: LoanV1LiquidatedPayload,
    @EmittedAt() emittedAt: Date,
    @TxHash() transactionHash: string
  ): Promise<void> {
    await this.loanService.liquidate(contract, payload, emittedAt, transactionHash);
  }
}
