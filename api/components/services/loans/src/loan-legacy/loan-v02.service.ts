import { plainToInstance } from 'class-transformer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupportedCurrencies } from '@nftfi.api/core';
import {
  FindConditions,
  MarketLoan,
  MarketLoanProtocol,
  MarketLoanRepository,
  MarketLoanStatus
} from '@nftfi.api/repositories/postgres/market-loan';
import { AssetsFacade } from '@nftfi.api/facades/assets';
import { Config } from '../config';
import { LoanV02Status, LoanV02SortKeyMap } from './loan-v02.types';
import { LoanV02Dto, LoanV02GetQueryDto } from './dtos';

const V02_TO_MARKET_STATUS: Record<LoanV02Status, MarketLoanStatus> = {
  [LoanV02Status.Active]: MarketLoanStatus.Active,
  [LoanV02Status.Repaid]: MarketLoanStatus.Repaid,
  [LoanV02Status.Liquidated]: MarketLoanStatus.Liquidated,
  [LoanV02Status.Defaulted]: MarketLoanStatus.Defaulted
};

const MARKET_TO_V02_STATUS: Record<MarketLoanStatus, LoanV02Status> = {
  [MarketLoanStatus.Active]: LoanV02Status.Active,
  [MarketLoanStatus.Repaid]: LoanV02Status.Repaid,
  [MarketLoanStatus.Liquidated]: LoanV02Status.Liquidated,
  [MarketLoanStatus.Defaulted]: LoanV02Status.Defaulted
};

@Injectable()
export class LoanV02Service {
  private readonly defaultPagination: Config['pagination'];

  constructor(
    configService: ConfigService,
    private readonly loanRepository: MarketLoanRepository,
    private readonly assetsFacade: AssetsFacade,
    private readonly supportedCurrencies: SupportedCurrencies
  ) {
    this.defaultPagination = configService.get<Config['pagination']>('pagination');
  }

  async getMany(query: LoanV02GetQueryDto): Promise<[MarketLoan[], number]> {
    const conditions = this.buildConditions(query);
    const limit = query.limit ?? this.defaultPagination.limit;
    const page = query.page ?? this.defaultPagination.page;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ? LoanV02SortKeyMap[query.sortBy] : undefined;
    const direction = query.sortDirection === 'asc' ? 'ASC' : 'DESC';

    const [loans, total] = await Promise.all([
      this.loanRepository.find(conditions, {
        skip,
        limit,
        sort: sortBy ? { by: sortBy, direction } : undefined
      }),
      this.loanRepository.count(conditions)
    ]);

    return [loans, total];
  }

  private buildConditions(query: LoanV02GetQueryDto): Partial<FindConditions> {
    return {
      protocols: [MarketLoanProtocol.Nftfi],
      statuses: [V02_TO_MARKET_STATUS[query.status]],
      borrower: query.borrowerAddress,
      lender: query.lenderAddress,
      nftContracts: query.nftAddresses
    };
  }

  async toDtos(loans: MarketLoan[]): Promise<LoanV02Dto[]> {
    const assets = await this.assetsFacade.getAssets({
      keys: loans.map(loan => ({ contract: loan.nftContract, tokenId: loan.nftTokenId }))
    });

    const dtos: LoanV02Dto[] = loans.map(loan => {
      const currency = this.supportedCurrencies.getByContract(loan.currency);
      const asset = assets.find(a => a.contract === loan.nftContract && a.tokenId === loan.nftTokenId)!;
      return {
        id: Number(loan.loanId),
        status: MARKET_TO_V02_STATUS[loan.status],
        date: {
          started: loan.startedAt,
          repaid: loan.status === MarketLoanStatus.Repaid ? loan.endedAt ?? null : null,
          due: loan.dueAt ?? null
        },
        nft: {
          id: asset.tokenId,
          address: asset.contract,
          name: asset.name,
          project: {
            name: asset.collection.name
          },
          image: {
            uri: asset.imageSmallUrl
          }
        },
        borrower: {
          address: loan.borrower
        },
        lender: {
          address: loan.lender
        },
        terms: {
          loan: {
            duration: loan.duration,
            repayment: loan.repaymentMax,
            principal: loan.principal,
            apr: loan.apr,
            effectiveApr: loan.eapr,
            origination: loan.originationFee,
            interest: {
              prorated: loan.prorated || false,
              bps: this.calculateInterestPercentage(loan)
            },
            currency: loan.currency,
            unit: currency.denomination
          }
        },
        nftfi: {
          contract: {
            name: loan.contract
          }
        }
      };
    });

    return plainToInstance(LoanV02Dto, dtos);
  }

  private calculateInterestPercentage(loan: MarketLoan): number {
    if (!loan.duration || !loan.apr) return 0;
    const days = loan.duration / 86400;
    return (loan.apr * days) / 365;
  }
}
