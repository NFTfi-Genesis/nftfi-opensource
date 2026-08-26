import { addHours } from 'date-fns';
import { BigNumber } from 'ethers';
import { formatUnits, parseUnits } from 'ethers/lib/utils';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { SupportedCurrencies, Ticker } from '@nftfi.api/core';
import {
  MarketLoanProtocol,
  MarketLoanRepository,
  MarketLoanStatus
} from '@nftfi.api/repositories/postgres/market-loan';
import { EthersFacade } from '@nftfi.api/modules/ethers-provider';
import { type FxRateConfig, FxRateConfigToken } from '@nftfi.api/modules/fx-rate-provider';
import { LoanHelperService } from '../loan-helper.service';
import { LoanMath } from '../loan-math';
import { WAD, SECONDS_PER_YEAR } from '../constants';
import type { LoanRefinancedPayload, LoanStartedPayload } from './blur-loan.types';

@Injectable()
export class BlurLoanService {
  private readonly logger = new Logger(BlurLoanService.name);

  constructor(
    private readonly loanRepository: MarketLoanRepository,
    private readonly ethersFacade: EthersFacade,
    private readonly loanHelper: LoanHelperService,
    private readonly supportedCurrencies: SupportedCurrencies,
    @Inject(FxRateConfigToken) readonly fxConfig: FxRateConfig
  ) {}

  async create(contract: string, txHash: string, emittedAt: Date, data: LoanStartedPayload): Promise<void> {
    const asset = await this.loanHelper.getAsset(data.collection, data.tokenId, `${contract}#${data.lienId}`);
    const currency = this.supportedCurrencies.getByTicker(Ticker.WETH).contractAddress;
    const apr = this.calculateApr(data.rate);
    const repaymentMax = await this.calculateRepayment(data.loanAmount, apr, 0);
    const interest = LoanMath.calculateInterest(data.loanAmount, repaymentMax);
    const amounts = await this.loanHelper.getAmounts(
      { principal: data.loanAmount, repayment: '0', repaymentMax, interest, originationFee: '0', adminFee: '0' },
      currency,
      emittedAt
    );

    await this.loanRepository.upsert({
      loanId: String(data.lienId),
      borrower: data.borrower,
      lender: data.lender,
      protocol: MarketLoanProtocol.Blur,
      contract,
      currency,
      nftContract: data.collection,
      nftTokenId: data.tokenId,
      asset: { id: asset.id },
      ...amounts,
      apr,
      eapr: apr,
      prorated: false,
      status: MarketLoanStatus.Active,
      startedAt: emittedAt,
      startedTx: txHash,
      duration: 0,
      dueAt: null
    });
    await this.loanHelper.invalidateCache();
  }

  async repay(contract: string, txHash: string, emittedAt: Date, loanId: string): Promise<void> {
    const loan = await this.loanRepository.findByKey(contract, loanId);
    if (!loan) {
      this.logger.warn(`Loan not found for repayment: contract=${contract} loanId=${loanId}`);
      return;
    }
    const amounts = await this.loanHelper.getAmounts(
      {
        repayment: loan.repaymentMax,
        interest: LoanMath.calculateInterest(loan.principal, loan.repaymentMax)
      },
      loan.currency,
      emittedAt
    );
    await this.loanRepository.updateByKey(contract, loanId, {
      status: MarketLoanStatus.Repaid,
      endedAt: emittedAt,
      endedTx: txHash,
      ...amounts
    });
    await this.loanHelper.invalidateCache();
  }

  // TODO: Blur refinance is treated as a renegotiation — the loan ID (lienId) is preserved and the
  // existing record is updated in place, rather than closing the old loan and creating a new one.
  // This deviates from the normalization approach used by other protocols, but changing it now would
  // be more costly than maintaining the current behavior. See the updateByKey call below.
  async refinance(contract: string, emittedAt: Date, data: LoanRefinancedPayload): Promise<void> {
    const loan = await this.loanRepository.findByKey(contract, data.lienId);
    if (!loan) {
      this.logger.warn(`Loan not found for refinance: contract=${contract} loanId=${data.lienId}`);
      return;
    }
    const currency = this.supportedCurrencies.getByTicker(Ticker.WETH).contractAddress;
    const apr = this.calculateApr(data.newRate);
    const repaymentMax = await this.calculateRepayment(data.newAmount, apr, 0);
    const interest = LoanMath.calculateInterest(data.newAmount, repaymentMax);
    const amounts = await this.loanHelper.getAmounts(
      { principal: data.newAmount, repayment: '0', repaymentMax, interest, originationFee: '0', adminFee: '0' },
      currency,
      emittedAt
    );

    await this.loanRepository.updateByKey(contract, data.lienId, {
      lender: data.newLender,
      ...amounts,
      apr,
      eapr: apr,
      startedAt: emittedAt,
      status: MarketLoanStatus.Active
    });
    await this.loanHelper.invalidateCache();
  }

  async defaulting(contract: string, txHash: string, emittedAt: Date, loanId: string): Promise<void> {
    await this.loanRepository.updateByKey(contract, loanId, {
      dueAt: addHours(emittedAt, 36)
    });
  }

  async liquidate(contract: string, txHash: string, emittedAt: Date, loanId: string): Promise<void> {
    await this.loanRepository.updateByKey(contract, loanId, {
      status: MarketLoanStatus.Liquidated,
      endedAt: emittedAt,
      endedTx: txHash
    });
    await this.loanHelper.invalidateCache();
  }

  async updateAmounts(): Promise<void> {
    const block = await this.ethersFacade.getLatestBlock();
    let updatedCount = 0;
    for await (const loan of this.loanRepository.iterateActiveByProtocol(MarketLoanProtocol.Blur)) {
      const startTime = BigNumber.from(Math.floor(loan.startedAt.getTime() / 1000));
      const duration = BigNumber.from(block.timestamp).sub(startTime);
      const repaymentMax = await this.calculateRepayment(loan.principal, loan.apr, duration.toNumber());
      const amounts = await this.loanHelper.getAmounts(
        {
          repaymentMax,
          interest: LoanMath.calculateInterest(loan.principal, repaymentMax)
        },
        loan.currency,
        new Date(block.timestamp * 1000),
        this.fxConfig.ethusdt
      );
      await this.loanRepository.updateByKey(loan.contract, loan.loanId, amounts);
      updatedCount++;
    }

    if (updatedCount > 0) {
      this.logger.log(`Updated amounts for ${updatedCount} active Blur loans`);
      await this.loanHelper.invalidateCache();
    }
  }

  private calculateApr(rate: string): number {
    return Number(rate) / 100;
  }

  private async calculateRepayment(principal: string, apr: number, duration: number): Promise<string> {
    if (apr == 0) return principal;

    const principalBN = BigNumber.from(principal);
    const timeInYears = BigNumber.from(duration).mul(WAD).div(SECONDS_PER_YEAR);
    const exponent = Number(formatUnits(timeInYears, 18));
    const aprNormilized = apr / 100;
    const mutiplier = Math.pow(1 + aprNormilized, exponent);

    return principalBN.mul(parseUnits(mutiplier.toString(), 18)).div(WAD).toString();
  }
}
