import {
  Block,
  EmittedAt,
  EventHandler,
  InternalId,
  Log,
  LogArgs,
  Subscriber,
  TxHash
} from '@nftfi.api/modules/ethers-observer';
import { NftfiLoanService } from '../nftfi-loan.service';
import { NftfiLoanV21FixedContract } from './nftfi-loan-v2-1-fixed.contract';
import type {
  LoanV21StartedPayload,
  LoanV21RenegotiatedPayload,
  LoanV21RepaidPayload,
  LoanV21LiquidatedPayload
} from './nftfi-loan-v2-1-fixed.types';

@Subscriber(NftfiLoanV21FixedContract)
export class NftfiLoanV21FixedSubscriber {
  constructor(private readonly loanService: NftfiLoanService) {}

  @EventHandler(NftfiLoanV21FixedContract.Event.LoanStarted)
  async onLoanStarted(
    @LogArgs() payload: LoanV21StartedPayload,
    @InternalId() eventId: string,
    @TxHash() txHash: string,
    @Block('number') blockNumber: number,
    @Log('address') contractAddress: string
  ): Promise<void> {
    await this.loanService.create(
      {
        loanId: payload.loanId,
        lender: payload.lender,
        borrower: payload.borrower,
        loanStartTime: payload.loanTerms.loanStartTime,
        loanDuration: payload.loanTerms.loanDuration,
        loanPrincipalAmount: payload.loanTerms.loanPrincipalAmount,
        maximumRepaymentAmount: payload.loanTerms.maximumRepaymentAmount,
        loanAdminFeeInBasisPoints: payload.loanTerms.loanAdminFeeInBasisPoints,
        originationFee: '0',
        loanERC20Denomination: payload.loanTerms.loanERC20Denomination,
        nftCollateralContract: payload.loanTerms.nftCollateralContract,
        nftCollateralId: payload.loanTerms.nftCollateralId,
        isProRata: false
      },
      { eventId, blockNumber, contract: contractAddress, tx: txHash }
    );
  }

  @EventHandler(NftfiLoanV21FixedContract.Event.LoanRenegotiated)
  async onLoanRenegotiated(
    @InternalId() eventId: string,
    @Log('address') contractAddress: string,
    @EmittedAt() emittedAt: Date,
    @Block('number') blockNumber: number,
    @LogArgs() payload: LoanV21RenegotiatedPayload
  ): Promise<void> {
    await this.loanService.renegotiate(
      {
        loanId: payload.loanId,
        newMaximumRepaymentAmount: payload.newMaximumRepaymentAmount,
        newLoanDuration: payload.newLoanDuration,
        isProRata: false
      },
      { eventId, contract: contractAddress, emittedAt, blockNumber }
    );
  }

  @EventHandler(NftfiLoanV21FixedContract.Event.LoanLiquidated)
  async onLoanLiquidated(
    @LogArgs() payload: LoanV21LiquidatedPayload,
    @InternalId() eventId: string,
    @TxHash() txHash: string,
    @EmittedAt() emittedAt: Date,
    @Block('number') blockNumber: number,
    @Log('address') contractAddress: string
  ): Promise<void> {
    await this.loanService.liquidate(
      {
        loanId: payload.loanId
      },
      { eventId, contract: contractAddress, tx: txHash, emittedAt, blockNumber }
    );
  }

  @EventHandler(NftfiLoanV21FixedContract.Event.LoanRepaid)
  async onLoanRepaid(
    @LogArgs() payload: LoanV21RepaidPayload,
    @InternalId() eventId: string,
    @TxHash() txHash: string,
    @EmittedAt() emittedAt: Date,
    @Block('number') blockNumber: number,
    @Log('address') contractAddress: string
  ): Promise<void> {
    await this.loanService.repay(
      {
        loanId: payload.loanId,
        borrower: payload.borrower,
        adminFee: payload.adminFee,
        loanPrincipalAmount: payload.loanPrincipalAmount,
        amountPaidToLender: payload.amountPaidToLender
      },
      { eventId, contract: contractAddress, blockNumber, tx: txHash, emittedAt }
    );
  }
}
