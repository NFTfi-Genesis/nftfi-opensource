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
import { NftfiLoanV1FixedContract } from './nftfi-loan-v1-fixed.contract';
import type { LoanV1LiquidatedPayload, LoanV1RepaidPayload, LoanV1StartedPayload } from './nftfi-loan-v1-fixed.types';

@Subscriber(NftfiLoanV1FixedContract)
export class NftfiLoanV1FixedSubscriber {
  constructor(private readonly loanService: NftfiLoanService) {}

  @EventHandler(NftfiLoanV1FixedContract.Event.LoanStarted)
  async onLoanStarted(
    @LogArgs() payload: LoanV1StartedPayload,
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
        loanStartTime: payload.loanStartTime,
        loanDuration: Number(payload.loanDuration),
        loanPrincipalAmount: payload.loanPrincipalAmount,
        maximumRepaymentAmount: payload.maximumRepaymentAmount,
        loanAdminFeeInBasisPoints: 0,
        originationFee: '0',
        loanERC20Denomination: payload.loanERC20Denomination,
        nftCollateralContract: payload.nftCollateralContract,
        nftCollateralId: payload.nftCollateralId,
        isProRata: false
      },
      { eventId, blockNumber, contract: contractAddress, tx: txHash }
    );
  }

  @EventHandler(NftfiLoanV1FixedContract.Event.LoanLiquidated)
  async onLoanLiquidated(
    @LogArgs() payload: LoanV1LiquidatedPayload,
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

  @EventHandler(NftfiLoanV1FixedContract.Event.LoanRepaid)
  async onLoanRepaid(
    @LogArgs() payload: LoanV1RepaidPayload,
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
