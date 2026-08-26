import { maxBy } from 'lodash';
import { addSeconds } from 'date-fns';
import { BigNumber } from 'ethers';
import { Injectable, Logger } from '@nestjs/common';
import {
  MarketLoanRepository,
  MarketLoanProtocol,
  MarketLoanStatus
} from '@nftfi.api/repositories/postgres/market-loan';
import { ContractRepository } from '@nftfi.api/modules/ethers-observer';
import { ListingsFacade } from '@nftfi.api/facades/listings';
import { ListingDeletedReason } from '@nftfi.api/repositories/postgres/listing';
import { LoanHelperService } from '../loan-helper.service';
import { LoanMath } from '../loan-math';
import { LoanEndedPayload, LoanRefinancedPayload, LoanRepaidPayload, LoanStartedPayload } from './gondi-loan.types';
import { GondiLoanContract } from './gondi-loan.contract';
import { GondiLoanMath } from './gondi-loan-math';

@Injectable()
export class GondiLoanService {
  protected readonly logger = new Logger(GondiLoanService.name);

  constructor(
    protected readonly loanRepository: MarketLoanRepository,
    protected readonly contractRepository: ContractRepository,
    protected readonly loanHelper: LoanHelperService,
    protected readonly listingsFacade: ListingsFacade
  ) {}

  async create(
    contract: GondiLoanContract,
    data: LoanStartedPayload,
    emittedAt: Date,
    transactionHash: string
  ): Promise<void> {
    const asset = await this.loanHelper.getAsset(
      data.nftCollateralAddress,
      data.nftCollateralTokenId,
      `${contract.address}#${data.loanId}`
    );

    const source = maxBy(data.sources, p => BigNumber.from(p.principalAmount).toBigInt());
    if (!source) {
      this.logger.warn(`Source not found for loan ${data.loanId}`);
      return;
    }

    const duration = GondiLoanMath.calculateDuration(
      Number(data.duration),
      emittedAt,
      new Date(Number(data.startTime) * 1000)
    );
    const repaymentMax = GondiLoanMath.calculateRepayment({
      duration: data.duration,
      sources: data.sources,
      feeAmount: data.feeAmount
    });
    const eapr = LoanMath.calculateApr({
      principal: data.principalAmount,
      repayment: repaymentMax,
      duration,
      originationFee: data.feeAmount
    });
    const interest = LoanMath.calculateInterest(data.principalAmount, repaymentMax);

    const amounts = await this.loanHelper.getAmounts(
      {
        principal: data.principalAmount,
        repayment: '0',
        repaymentMax,
        interest,
        originationFee: data.feeAmount,
        adminFee: '0'
      },
      data.principalAddress,
      emittedAt
    );

    await this.loanRepository.upsert({
      lender: source.lender,
      borrower: data.borrower,
      loanId: data.loanId,
      protocol: MarketLoanProtocol.Gondi,
      contract: contract.address,
      currency: data.principalAddress,
      nftContract: data.nftCollateralAddress,
      nftTokenId: data.nftCollateralTokenId,
      asset: { id: asset.id },
      ...amounts,
      apr: GondiLoanMath.calculateApr(source),
      eapr,
      prorated: false,
      status: MarketLoanStatus.Active,
      startedAt: emittedAt,
      startedTx: transactionHash,
      dueAt: addSeconds(emittedAt, duration),
      duration
    });
    await this.loanHelper.invalidateCache();
    await this.listingsFacade.deleteByNftKey(
      data.nftCollateralAddress,
      data.nftCollateralTokenId,
      ListingDeletedReason.LoanStarted
    );
  }

  async refinance(
    contract: GondiLoanContract,
    data: LoanRefinancedPayload,
    emittedAt: Date,
    transactionHash: string
  ): Promise<void> {
    const loan = await this.loanHelper.getLoanByKey(contract.address, data.oldLoanId);
    await this.repay(
      contract,
      {
        loanId: data.oldLoanId,
        totalRepayment: GondiLoanMath.calculateRefiRepayment(loan, emittedAt)
      },
      emittedAt,
      transactionHash
    );
    await this.create(
      contract,
      { ...data, loanId: data.newLoanId, feeAmount: data.feeAmount },
      emittedAt,
      transactionHash
    );
  }

  async repay(
    contract: GondiLoanContract,
    data: LoanRepaidPayload,
    emittedAt: Date,
    transactionHash: string
  ): Promise<void> {
    const loan = await this.loanHelper.getLoanByKey(contract.address, data.loanId);
    const amounts = await this.loanHelper.getAmounts(
      {
        repayment: data.totalRepayment,
        interest: LoanMath.calculateInterest(loan.principal, data.totalRepayment)
      },
      loan.currency,
      emittedAt
    );

    await this.loanRepository.updateByKey(contract.address, data.loanId, {
      status: MarketLoanStatus.Repaid,
      endedAt: emittedAt,
      endedTx: transactionHash,
      ...amounts,
      eapr: LoanMath.calculateApr({
        principal: loan.principal,
        repayment: data.totalRepayment,
        duration: loan.duration,
        originationFee: loan.originationFee
      })
    });
    await this.loanHelper.invalidateCache();
  }

  async liquidate(
    contract: GondiLoanContract,
    data: LoanEndedPayload,
    emittedAt: Date,
    transactionHash: string
  ): Promise<void> {
    await this.loanRepository.updateByKey(contract.address, data.loanId, {
      status: MarketLoanStatus.Liquidated,
      endedAt: emittedAt,
      endedTx: transactionHash
    });
    await this.loanHelper.invalidateCache();
  }
}
