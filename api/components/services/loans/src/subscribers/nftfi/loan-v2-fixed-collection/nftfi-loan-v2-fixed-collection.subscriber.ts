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
import { NftfiLoanV2FixedCollectionContract } from './nftfi-loan-v2-fixed-collection.contract';
import type {
  LoanV2LiquidatedPayload,
  LoanV2RenegotiatedPayload,
  LoanV2RepaidPayload,
  LoanV2StartedPayload
} from './nftfi-loan-v2-fixed-collection.types';

@Subscriber(NftfiLoanV2FixedCollectionContract)
export class NftfiLoanV2FixedCollectionSubscriber {
  constructor(private readonly loanService: NftfiLoanService) {}

  @EventHandler(NftfiLoanV2FixedCollectionContract.Event.LoanStarted)
  async onLoanStarted(
    @LogArgs() payload: LoanV2StartedPayload,
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

  @EventHandler(NftfiLoanV2FixedCollectionContract.Event.LoanRenegotiated)
  async onLoanRenegotiated(
    @InternalId() eventId: string,
    @EmittedAt() emittedAt: Date,
    @Block('number') blockNumber: number,
    @Log('address') contractAddress: string,
    @LogArgs() payload: LoanV2RenegotiatedPayload
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

  @EventHandler(NftfiLoanV2FixedCollectionContract.Event.LoanLiquidated)
  async onLoanLiquidated(
    @LogArgs() payload: LoanV2LiquidatedPayload,
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

  @EventHandler(NftfiLoanV2FixedCollectionContract.Event.LoanRepaid)
  async onLoanRepaid(
    @LogArgs() payload: LoanV2RepaidPayload,
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
