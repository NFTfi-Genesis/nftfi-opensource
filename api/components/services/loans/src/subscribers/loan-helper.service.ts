import { Injectable, Logger } from '@nestjs/common';
import { isString } from 'lodash';
import { SupportedCurrencies } from '@nftfi.api/core';
import { AssetDto, AssetsFacade } from '@nftfi.api/facades/assets';
import { LoansFacade } from '@nftfi.api/facades/loans';
import { OffersFacade, WinningOfferKey } from '@nftfi.api/facades/offers';
import { FxRatesFacade } from '@nftfi.api/facades/fx-rates';
import {
  MarketLoanAmounts,
  MarketLoanRepository,
  MarketLoanWeiAmounts,
  MarketLoanStatus,
  MarketLoanProtocol,
  MarketLoan
} from '@nftfi.api/repositories/postgres/market-loan';
import { ContractRepository } from '@nftfi.api/modules/ethers-observer';

@Injectable()
export class LoanHelperService {
  private readonly logger = new Logger(LoanHelperService.name);
  constructor(
    private readonly supportedCurrencies: SupportedCurrencies,
    private readonly fxRates: FxRatesFacade,
    private readonly loanRepository: MarketLoanRepository,
    private readonly contractRepository: ContractRepository,
    private readonly assetsFacade: AssetsFacade,
    private readonly loansFacade: LoansFacade,
    private readonly offersFacade: OffersFacade
  ) {}

  async invalidateCache(): Promise<void> {
    await this.loansFacade.invalidateCache();
  }

  async deleteWinningOffer(key: WinningOfferKey): Promise<void> {
    await this.offersFacade.deleteWinningOffer(key);
  }

  async acceptRenegotiation(loanId: string, contract: string): Promise<void> {
    await this.offersFacade.acceptRenegotiation({ loanId, contract });
  }

  async getLoanByKey(contract: string, loanId: string): Promise<MarketLoan> {
    const loan = await this.loanRepository.findByKey(contract, loanId);
    if (!loan) {
      throw new Error(`Loan not found: contract=${contract} loanId=${loanId}`);
    }
    return loan;
  }

  async getAsset(nftContract: string, nftTokenId: string, loanKey: string): Promise<AssetDto> {
    const asset = await this.assetsFacade.getAssetByKey(nftContract, nftTokenId);
    if (!asset) {
      throw new Error(`Asset not found for loan ${loanKey}: ${nftContract}#${nftTokenId}`);
    }
    return asset;
  }

  async getAmounts(
    amounts: Partial<MarketLoanWeiAmounts>,
    currency: string,
    date: Date,
    rate?: number
  ): Promise<MarketLoanAmounts> {
    const result = { ...amounts } as MarketLoanAmounts;
    const fxRate = rate ?? (await this.fxRates.getRateAtDate(date));
    const calculateUsdAmount = (amount: string): number =>
      this.supportedCurrencies.calculateUsdAmount(currency, amount, fxRate);
    const calculateEthAmount = (amount: string): number =>
      this.supportedCurrencies.calculateEthAmount(currency, amount);

    if (isString(result.principal)) {
      result.principalUsd = calculateUsdAmount(result.principal);
      result.principalEth = calculateEthAmount(result.principal);
    }
    if (isString(result.repayment)) {
      result.repaymentUsd = calculateUsdAmount(result.repayment);
      result.repaymentEth = calculateEthAmount(result.repayment);
    }
    if (isString(result.repaymentMax)) {
      result.repaymentMaxUsd = calculateUsdAmount(result.repaymentMax);
      result.repaymentMaxEth = calculateEthAmount(result.repaymentMax);
    }
    if (isString(result.interest)) {
      result.interestUsd = calculateUsdAmount(result.interest);
      result.interestEth = calculateEthAmount(result.interest);
    }
    if (isString(result.originationFee)) {
      result.originationFeeUsd = calculateUsdAmount(result.originationFee);
      result.originationFeeEth = calculateEthAmount(result.originationFee);
    }
    if (isString(result.adminFee)) {
      result.adminFeeUsd = calculateUsdAmount(result.adminFee);
      result.adminFeeEth = calculateEthAmount(result.adminFee);
    }

    return result;
  }

  async markOverdueLoansAsDefaulted(protocol: MarketLoanProtocol): Promise<void> {
    const overdueLoans = await this.loanRepository.findOverdue(protocol, new Date(), { skip: 0, limit: 100 });
    const ids: number[] = overdueLoans.reduce<number[]>((acc, loan) => {
      const contract = this.contractRepository.findByAddress(loan.contract);
      if (!contract?.replayed) return acc;
      return acc.concat(loan.id);
    }, []);
    if (!ids.length) return;

    await this.loanRepository.updateByIds(ids, { status: MarketLoanStatus.Defaulted });
    this.logger.log(`Updated ${ids.length} overdue loans to Defaulted status: ${ids.join(', ')}`);

    await this.invalidateCache();
  }
}
