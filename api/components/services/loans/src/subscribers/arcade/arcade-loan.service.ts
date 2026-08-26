import { addSeconds } from 'date-fns';
import { BigNumber } from 'ethers';
import { Injectable } from '@nestjs/common';
import {
  MarketLoanProtocol,
  MarketLoanRepository,
  MarketLoanStatus
} from '@nftfi.api/repositories/postgres/market-loan';
import { ContractRepository } from '@nftfi.api/modules/ethers-observer';
import { LoanHelperService } from '../loan-helper.service';
import { LoanMath } from '../loan-math';
import { ArcadeLoanV2Contract } from './arcade-loan-v2.contract';
import { ArcadeLoanV3Contract } from './arcade-loan-v3.contract';
import type {
  LoanPayload,
  LoanStartedPayload,
  OnChainLoanTerms,
  OnChainLoanV2,
  OnChainLoanV3
} from './arcade-loan.types';

const INTEREST_RATE_DENOMINATOR = BigNumber.from('1000000000000000000'); // 1e18
const BASIS_POINTS_DENOMINATOR = BigNumber.from('10000'); // 1e4
const DENOMINATOR = INTEREST_RATE_DENOMINATOR.mul(BASIS_POINTS_DENOMINATOR);

@Injectable()
export class ArcadeLoanService {
  constructor(
    private readonly contractRepository: ContractRepository,
    private readonly loanRepository: MarketLoanRepository,
    private readonly loanHelper: LoanHelperService
  ) {}

  async createV2(contract: string, transactionHash: string, data: LoanStartedPayload): Promise<void> {
    const loan = await this.getLoanV2(data.loanId);
    const { terms, startDate } = loan.loanData;
    await this.create(contract, transactionHash, data, {
      collateralAddress: terms.collateralAddress,
      collateralId: terms.collateralId,
      principal: terms.principal,
      payableCurrency: terms.payableCurrency,
      durationSecs: terms.durationSecs,
      interestRate: terms.interestRate,
      originationFee: String(loan.loanData.lateFeesAccrued),
      startDate
    });
  }

  async createV3(contract: string, transactionHash: string, data: LoanStartedPayload): Promise<void> {
    const loan = await this.getLoanV3(data.loanId);
    const { terms, startDate } = loan.loanData;
    await this.create(contract, transactionHash, data, {
      collateralAddress: terms.collateralAddress,
      collateralId: terms.collateralId,
      principal: terms.principal,
      payableCurrency: terms.payableCurrency,
      durationSecs: terms.durationSecs,
      interestRate: terms.proratedInterestRate,
      originationFee: String(loan.loanData.feeSnapshot.lenderDefaultFee),
      startDate
    });
  }

  private async create(
    contract: string,
    transactionHash: string,
    data: LoanStartedPayload,
    loanTerms: OnChainLoanTerms
  ): Promise<void> {
    const asset = await this.loanHelper.getAsset(
      loanTerms.collateralAddress,
      loanTerms.collateralId,
      `${contract}#${data.loanId}`
    );

    const repaymentMax = this.calculateRepayment({ principal: loanTerms.principal, interest: loanTerms.interestRate });
    const startedAt = new Date(Number(loanTerms.startDate) * 1000);
    const duration = Number(loanTerms.durationSecs);
    const { originationFee } = loanTerms;
    const interest = LoanMath.calculateInterest(loanTerms.principal, repaymentMax);
    const apr = LoanMath.calculateApr({
      principal: loanTerms.principal,
      repayment: repaymentMax,
      duration,
      originationFee
    });
    const amounts = await this.loanHelper.getAmounts(
      {
        principal: loanTerms.principal,
        repayment: '0',
        repaymentMax,
        interest,
        originationFee,
        adminFee: '0'
      },
      loanTerms.payableCurrency,
      startedAt
    );

    await this.loanRepository.upsert({
      loanId: String(data.loanId),
      borrower: data.borrower,
      lender: data.lender,
      protocol: MarketLoanProtocol.Arcade,
      contract,
      currency: loanTerms.payableCurrency,
      nftContract: loanTerms.collateralAddress,
      nftTokenId: loanTerms.collateralId,
      asset: { id: asset.id },
      ...amounts,
      apr,
      eapr: apr,
      prorated: false,
      status: MarketLoanStatus.Active,
      startedAt,
      startedTx: transactionHash,
      dueAt: addSeconds(startedAt, duration),
      duration
    });
    await this.loanHelper.invalidateCache();
  }

  async repay(contract: string, transactionHash: string, emittedAt: Date, data: LoanPayload): Promise<void> {
    await this.loanRepository.updateByKey(contract, String(data.loanId), {
      status: MarketLoanStatus.Repaid,
      endedAt: emittedAt,
      endedTx: transactionHash
    });
    await this.loanHelper.invalidateCache();
  }

  async liquidate(contract: string, transactionHash: string, emittedAt: Date, data: LoanPayload): Promise<void> {
    await this.loanRepository.updateByKey(contract, String(data.loanId), {
      status: MarketLoanStatus.Liquidated,
      endedAt: emittedAt,
      endedTx: transactionHash
    });
    await this.loanHelper.invalidateCache();
  }

  private async getLoanV2(loanId: number): Promise<OnChainLoanV2> {
    const loanContract = this.contractRepository.findByType(ArcadeLoanV2Contract);
    return loanContract.call<OnChainLoanV2>('getLoan', loanId);
  }

  private async getLoanV3(loanId: number): Promise<OnChainLoanV3> {
    const loanContract = this.contractRepository.findByType(ArcadeLoanV3Contract);
    return loanContract.call<OnChainLoanV3>('getLoan', loanId);
  }

  private calculateRepayment(loan: { principal: string; interest: string }): string {
    const principal = BigNumber.from(loan.principal);
    const interest = BigNumber.from(loan.interest);
    const interestAmount = principal.mul(interest).div(DENOMINATOR);
    return principal.add(interestAmount).toString();
  }
}
