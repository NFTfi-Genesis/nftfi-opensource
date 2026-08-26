import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { formatUnits } from 'ethers/lib/utils';

import { SupportedCurrencies } from '@nftfi.api/core';
import { MarketLoan } from '@nftfi.api/repositories/postgres/market-loan';
import { NftfiSmartNftIdRepository } from '@nftfi.api/repositories/postgres/nftfi-smart-nft-id';

import { Config } from '../config';
import {
  CONFIG_KEY_TO_CONTRACT_NAME,
  DESCRIPTIONS,
  OBLIGATION_IMAGE_URL,
  PROMISSORY_IMAGE_URL,
  SmartNftType
} from './loan-metadata.constants';
import { LoanMetadataAttribute, LoanMetadataResponse } from './loan-metadata.types';

@Injectable()
export class LoanMetadataService {
  private dappUrl: string;
  private addressToContractName: Map<string, string>;

  constructor(
    private readonly configService: ConfigService,
    private readonly smartNftDataRepository: NftfiSmartNftIdRepository,
    private readonly supportedCurrencies: SupportedCurrencies
  ) {
    this.dappUrl = this.configService.get<Config['dapp']>('dapp').url;
    this.addressToContractName = this.buildAddressToContractNameMap();
  }

  async getMetadata(smartNftId: string, type: SmartNftType): Promise<LoanMetadataResponse> {
    const smartNftData = await this.smartNftDataRepository.findBySmartNftId(smartNftId);

    if (!smartNftData) {
      throw new NotFoundException(`Smart NFT not found (smartNftId: ${smartNftId})`);
    }

    if (!smartNftData.loan) {
      throw new NotFoundException(`Loan not valid (smartNftId: ${smartNftId})`);
    }

    const loan = smartNftData.loan;
    const imageUrl = type === SmartNftType.Obligation ? OBLIGATION_IMAGE_URL : PROMISSORY_IMAGE_URL;
    const attributes = this.buildAttributes(loan);

    return {
      name: `NFTfi Loan #${loan.loanId}`,
      description: DESCRIPTIONS[type],
      image: imageUrl,
      external_url: `${this.dappUrl}/assets/${loan.nftContract}/${loan.nftTokenId}`,
      ...(attributes.length > 0 ? { attributes } : {})
    };
  }

  getImageUrl(type: SmartNftType): string {
    return type === SmartNftType.Obligation ? OBLIGATION_IMAGE_URL : PROMISSORY_IMAGE_URL;
  }

  private buildAddressToContractNameMap(): Map<string, string> {
    const nftfiContracts = this.configService.get<Config['ethereum']>('ethereum').contracts.nftfi;
    const map = new Map<string, string>();
    for (const [configKey, contractName] of Object.entries(CONFIG_KEY_TO_CONTRACT_NAME)) {
      const entry = nftfiContracts[configKey as keyof typeof nftfiContracts];
      if (entry?.address) {
        map.set(entry.address.toLowerCase(), contractName);
      }
    }
    return map;
  }

  private buildAttributes(loan: MarketLoan): LoanMetadataAttribute[] {
    const currency = this.supportedCurrencies.getByContract(loan.currency);
    const ticker = currency.ticker.toUpperCase();
    const denomination = currency.denomination;

    const loanAmount = this.formatAmount(loan.principal, denomination);
    const repaymentAmount = this.formatAmount(loan.repaymentMax, denomination);

    const durationDays = Math.floor(loan.duration / 86400);
    const apr = this.formatApr(loan.apr);

    const contractName = this.resolveContractName(loan.contract);
    const loanKey = `${contractName}-${loan.loanId}`;

    return [
      { trait_type: 'Amount Borrowed', value: `${loanAmount} ${ticker}` },
      { trait_type: 'Amount Repaid', value: `${repaymentAmount} ${ticker}` },
      { trait_type: 'APR', value: `~${apr}%` },
      { display_type: 'date', trait_type: 'Date Initiated', value: new Date(loan.startedAt).getTime() },
      { display_type: 'date', trait_type: 'Date of Repayment', value: new Date(loan.dueAt).getTime() },
      { trait_type: 'Duration', value: `${durationDays} days` },
      { trait_type: 'Loan Key', value: loanKey },
      { trait_type: 'Loan ID', value: `${loan.loanId}` },
      { trait_type: 'Loan Contract Name', value: contractName },
      { trait_type: 'Loan Contract Address', value: loan.contract },
      { trait_type: 'Collateral Token ID', value: `${loan.nftTokenId}` },
      { trait_type: 'Collateral Contract Address', value: loan.nftContract }
    ];
  }

  private resolveContractName(contractAddress: string): string {
    return this.addressToContractName.get(contractAddress.toLowerCase()) || 'Unknown';
  }

  private formatAmount(rawAmount: string, denomination: string): string {
    const formatted = formatUnits(rawAmount, denomination);
    return this.formatDisplayAmount(formatted);
  }

  private formatDisplayAmount(value: string): string {
    const num = parseFloat(value);
    if (num === 0) return '0';
    if (num < 0.001) return '< 0.001';
    if (num < 1_000) return new Intl.NumberFormat([], { maximumFractionDigits: 2 }).format(num);
    if (num < 10_000) return new Intl.NumberFormat([], { maximumFractionDigits: 1 }).format(num);
    if (num < 100_000) return new Intl.NumberFormat([], { maximumFractionDigits: 0 }).format(num);
    if (num < 1_000_000)
      return new Intl.NumberFormat([], { maximumFractionDigits: 2, notation: 'compact' }).format(num);
    if (num < 100_000_000)
      return new Intl.NumberFormat([], { maximumFractionDigits: 1, notation: 'compact' }).format(num);
    if (num < 10 ** 15) return new Intl.NumberFormat([], { maximumFractionDigits: 0, notation: 'compact' }).format(num);
    return '> 1000T';
  }

  private formatApr(apr: number): number {
    return Number.isFinite(apr) ? Number(Math.max(apr, 0).toFixed(0)) : 0;
  }
}
