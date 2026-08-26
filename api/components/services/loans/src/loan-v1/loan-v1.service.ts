import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { RedisStore } from 'cache-manager-ioredis-yet';
import { plainToInstance } from 'class-transformer';
import { compact, uniq } from 'lodash';
import { SortDirection } from '@nftfi.api/validation';
import { invalidateCacheByScope } from '@nftfi.api/core';
import { FindConditions, MarketLoan, MarketLoanRepository } from '@nftfi.api/repositories/postgres/market-loan';
import { ContractRepository } from '@nftfi.api/modules/ethers-observer';
import { AssetDto, AssetsFacade } from '@nftfi.api/facades/assets';
import { LoanV1Dto, LoanV1GetQueryDto } from './dtos';
import { LoansCacheScope } from './loan-v1.types';

@Injectable()
export class LoanV1Service {
  constructor(
    private readonly loanRepository: MarketLoanRepository,
    private readonly contractRepository: ContractRepository,
    private readonly assetsFacade: AssetsFacade,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache<RedisStore>
  ) {}

  async getMany(query: LoanV1GetQueryDto): Promise<MarketLoan[]> {
    const skip = (query.page - 1) * query.limit;
    const sortDirection = query.sortDirection === SortDirection.Asc ? 'ASC' : 'DESC';
    const loans = await this.loanRepository.find(this.buildFilter(query), {
      skip,
      limit: query.limit,
      sort: query.sortBy ? { by: query.sortBy, direction: sortDirection } : undefined
    });
    return loans;
  }

  async count(query: LoanV1GetQueryDto): Promise<number> {
    return this.loanRepository.count(this.buildFilter(query));
  }

  private buildFilter(query: LoanV1GetQueryDto): Partial<FindConditions> {
    const statuses = uniq(compact([query.status, ...(query.statuses ?? [])]));
    const wallets = uniq(compact([query.wallet, ...(query.wallets ?? [])]));
    return {
      statuses: statuses.length ? statuses : undefined,
      borrower: query.borrower,
      lender: query.lender,
      wallets: wallets.length ? wallets : undefined,
      dueAtBefore: query.dueAtBefore,
      currencies: query.currencies,
      collectionIds: query.collectionIds,
      protocols: query.protocols,
      nftIds: query.nftIds
    };
  }

  async toDtos(data: MarketLoan[]): Promise<LoanV1Dto[]> {
    const assets = await this.getAssets(data);

    const result: LoanV1Dto[] = data.map(loan => {
      const contract = this.contractRepository.findByAddress(loan.contract);
      const asset = assets.find(a => a.contract === loan.nftContract && a.tokenId === loan.nftTokenId)!;
      return {
        id: loan.id,
        loanId: loan.loanId,
        contract: loan.contract,
        contractName: contract ? contract.constructor.name : 'Unknown',
        protocol: loan.protocol,
        status: loan.status,
        borrower: loan.borrower,
        lender: loan.lender,
        currency: loan.currency,
        principal: loan.principal,
        repayment: loan.repayment,
        repaymentMax: loan.repaymentMax,
        interest: loan.interest,
        originationFee: loan.originationFee,
        adminFee: loan.adminFee,
        apr: loan.apr,
        eapr: loan.eapr,
        duration: loan.duration,
        prorated: loan.prorated,
        startedAt: loan.startedAt,
        endedAt: loan.endedAt ?? null,
        dueAt: loan.dueAt,
        asset
      };
    });

    return plainToInstance(LoanV1Dto, result);
  }

  async getAssets(data: MarketLoan[]): Promise<AssetDto[]> {
    if (!data.length) {
      return [];
    }

    const assets = await this.assetsFacade.getAssets({
      keys: data.map(loan => ({ contract: loan.nftContract, tokenId: loan.nftTokenId }))
    });
    return assets;
  }

  async invalidateCache(): Promise<void> {
    await invalidateCacheByScope(this.cacheManager, LoansCacheScope);
  }
}
