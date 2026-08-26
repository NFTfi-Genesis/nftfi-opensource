import { EventHandler } from '@nftfi.api/modules/ethers-observer';
import { LogArgs, Subscriber, Contract, EmittedAt, TxHash } from '@nftfi.api/modules/ethers-observer/decorators';
import { GondiLoanService } from '../gondi-loan.service';
import { GondiLoanV31Contract } from './gondi-loan-v31.contract';
import type {
  LoanV3LiquidatedPayload,
  LoanV3RefinancedNewOfferPayload,
  LoanV3RefinancedPayload,
  LoanV3RepaidPayload,
  LoanV3StartedPayload
} from '../loan-v3/gondi-loan-v3.types';

@Subscriber(GondiLoanV31Contract)
export class GondiLoanV31Subscriber {
  constructor(private readonly loanService: GondiLoanService) {}

  @EventHandler(GondiLoanV31Contract.Event.Started)
  async onLoanStarted(
    @Contract() contract: GondiLoanV31Contract,
    @LogArgs() payload: LoanV3StartedPayload,
    @EmittedAt() emittedAt: Date,
    @TxHash() transactionHash: string
  ): Promise<void> {
    await this.loanService.create(
      contract,
      {
        loanId: payload.loanId,
        borrower: payload.loan.borrower,
        startTime: payload.loan.startTime,
        duration: payload.loan.duration,
        nftCollateralAddress: payload.loan.nftCollateralAddress,
        nftCollateralTokenId: payload.loan.nftCollateralTokenId,
        principalAddress: payload.loan.principalAddress,
        principalAmount: payload.loan.principalAmount,
        feeAmount: payload.fee,
        sources: payload.loan.tranche.map(t => ({
          lender: t.lender,
          aprBps: t.aprBps,
          principalAmount: t.principalAmount,
          accruedInterest: t.accruedInterest
        }))
      },
      emittedAt,
      transactionHash
    );
  }

  @EventHandler(GondiLoanV31Contract.Event.Refinanced)
  async onLoanRefinanced(
    @Contract() contract: GondiLoanV31Contract,
    @LogArgs() payload: LoanV3RefinancedPayload,
    @EmittedAt() emittedAt: Date,
    @TxHash() transactionHash: string
  ): Promise<void> {
    await this.loanService.refinance(
      contract,
      {
        oldLoanId: payload.oldLoanId,
        newLoanId: payload.newLoanId,
        borrower: payload.loan.borrower,
        startTime: payload.loan.startTime,
        duration: payload.loan.duration,
        nftCollateralAddress: payload.loan.nftCollateralAddress,
        nftCollateralTokenId: payload.loan.nftCollateralTokenId,
        principalAddress: payload.loan.principalAddress,
        principalAmount: payload.loan.principalAmount,
        feeAmount: payload.fee,
        sources: payload.loan.tranche.map(t => ({
          lender: t.lender,
          aprBps: t.aprBps,
          principalAmount: t.principalAmount,
          accruedInterest: t.accruedInterest
        }))
      },
      emittedAt,
      transactionHash
    );
  }

  @EventHandler(GondiLoanV31Contract.Event.RefinancedNewOffer)
  async onLoanRefinancedNewOffer(
    @Contract() contract: GondiLoanV31Contract,
    @LogArgs() payload: LoanV3RefinancedNewOfferPayload,
    @EmittedAt() emittedAt: Date,
    @TxHash() transactionHash: string
  ): Promise<void> {
    await this.loanService.refinance(
      contract,
      {
        oldLoanId: payload.loanId,
        newLoanId: payload.newLoanId,
        borrower: payload.loan.borrower,
        startTime: payload.loan.startTime,
        duration: payload.loan.duration,
        nftCollateralAddress: payload.loan.nftCollateralAddress,
        nftCollateralTokenId: payload.loan.nftCollateralTokenId,
        principalAddress: payload.loan.principalAddress,
        principalAmount: payload.loan.principalAmount,
        feeAmount: payload.totalFee,
        sources: payload.loan.tranche.map(t => ({
          lender: t.lender,
          aprBps: t.aprBps,
          principalAmount: t.principalAmount,
          accruedInterest: t.accruedInterest
        }))
      },
      emittedAt,
      transactionHash
    );
  }

  @EventHandler(GondiLoanV31Contract.Event.Repaid)
  async onLoanRepaid(
    @Contract() contract: GondiLoanV31Contract,
    @LogArgs() payload: LoanV3RepaidPayload,
    @EmittedAt() emittedAt: Date,
    @TxHash() transactionHash: string
  ): Promise<void> {
    await this.loanService.repay(contract, payload, emittedAt, transactionHash);
  }

  @EventHandler(GondiLoanV31Contract.Event.Liquidated)
  async onLoanLiquidated(
    @Contract() contract: GondiLoanV31Contract,
    @LogArgs() payload: LoanV3LiquidatedPayload,
    @EmittedAt() emittedAt: Date,
    @TxHash() transactionHash: string
  ): Promise<void> {
    await this.loanService.liquidate(contract, payload, emittedAt, transactionHash);
  }

  @EventHandler(GondiLoanV31Contract.Event.Foreclosed)
  async onLoanForeclosed(
    @Contract() contract: GondiLoanV31Contract,
    @LogArgs() payload: LoanV3LiquidatedPayload,
    @EmittedAt() emittedAt: Date,
    @TxHash() transactionHash: string
  ): Promise<void> {
    await this.loanService.liquidate(contract, payload, emittedAt, transactionHash);
  }
}
