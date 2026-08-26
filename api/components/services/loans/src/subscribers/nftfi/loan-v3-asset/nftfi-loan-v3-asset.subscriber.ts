import { EventHandler, InternalId, Log, LogArgs, Subscriber } from '@nftfi.api/modules/ethers-observer';
import { Block, EmittedAt, TxHash } from '@nftfi.api/modules/ethers-observer/decorators';
import { NftfiLoanService } from '../nftfi-loan.service';
import { NftfiLoanV3AssetContract } from './nftfi-loan-v3-asset.contract';
import type {
  LoanV3LiquidatedEventPayload,
  LoanV3RenegotiatedEventPayload,
  LoanV3RepaidEventPayload,
  LoanV3StartedEventPayload
} from '../nftfi-loan-contract.types';

@Subscriber(NftfiLoanV3AssetContract)
export class NftfiLoanV3AssetSubscriber {
  constructor(private readonly loanService: NftfiLoanService) {}

  @EventHandler(NftfiLoanV3AssetContract.Event.LoanStarted)
  async onLoanStarted(
    @LogArgs() payload: LoanV3StartedEventPayload,
    @InternalId() eventId: string,
    @TxHash() txHash: string,
    @Block('number') blockNumber: number,
    @Log('address') contractAddress: string
  ): Promise<void> {
    await this.loanService.createV3(
      {
        loanId: payload.loanId,
        lender: payload.lender,
        borrower: payload.borrower,
        loanStartTime: payload.loanTerms.loanStartTime,
        loanDuration: payload.loanTerms.loanDuration,
        loanPrincipalAmount: payload.loanTerms.loanPrincipalAmount,
        maximumRepaymentAmount: payload.loanTerms.maximumRepaymentAmount,
        loanAdminFeeInBasisPoints: payload.loanTerms.loanAdminFeeInBasisPoints,
        originationFee: payload.loanTerms.originationFee,
        loanERC20Denomination: payload.loanTerms.loanERC20Denomination,
        nftCollateralContract: payload.loanTerms.nftCollateralContract,
        nftCollateralId: payload.loanTerms.nftCollateralId,
        isProRata: payload.loanTerms.isProRata
      },
      { eventId, blockNumber, contract: contractAddress, tx: txHash }
    );
  }

  @EventHandler(NftfiLoanV3AssetContract.Event.LoanRenegotiated)
  async onLoanRenegotiated(
    @LogArgs() payload: LoanV3RenegotiatedEventPayload,
    @InternalId() eventId: string,
    @EmittedAt() emittedAt: Date,
    @Block('number') blockNumber: number,
    @Log('address') contractAddress: string
  ): Promise<void> {
    await this.loanService.renegotiate(
      {
        loanId: payload.loanId,
        newMaximumRepaymentAmount: payload.newMaximumRepaymentAmount,
        newLoanDuration: payload.newLoanDuration,
        isProRata: payload.isProRata
      },
      { eventId, contract: contractAddress, emittedAt, blockNumber }
    );
  }

  @EventHandler(NftfiLoanV3AssetContract.Event.LoanLiquidated)
  async onLoanLiquidated(
    @LogArgs() payload: LoanV3LiquidatedEventPayload,
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

  @EventHandler(NftfiLoanV3AssetContract.Event.LoanRepaid)
  async onLoanRepaid(
    @LogArgs() payload: LoanV3RepaidEventPayload,
    @InternalId() eventId: string,
    @TxHash() txHash: string,
    @EmittedAt() emittedAt: Date,
    @Block('number') blockNumber: number,
    @Log('address') contractAddress: string
  ): Promise<void> {
    payload.amountPaidToLender;
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
