import {
  And,
  Brackets,
  Equal,
  FindOptionsWhere,
  In,
  IsNull,
  LessThan,
  LessThanOrEqual,
  Not,
  Repository as RepositoryType,
  SelectQueryBuilder
} from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import { isDate, isString, isArray } from 'lodash';
import { InjectRepository } from '@nestjs/typeorm';
import { SupportedCurrencies, Ticker } from '@nftfi.api/core';
import { type FxRateConfig, FxRateConfigToken } from '@nftfi.api/modules/fx-rate-provider';
import { FindOptions } from '../types';
import { COLLECTION_TABLE_NAME } from '../collection/collection.types';
import { Repository } from '../repository';
import { MarketLoan } from './market-loan.entity';
import {
  DraftMarketLoan,
  MarketLoanStatus,
  FindConditions,
  MarketLoanProtocol,
  MarketLoanSortKeys
} from './market-loan.types';

@Injectable()
export class MarketLoanRepository extends Repository {
  private readonly tableAlias = 'mloans';
  private readonly assetsJoinAlias = 'assets';

  constructor(
    @InjectRepository(MarketLoan) private readonly model: RepositoryType<MarketLoan>,
    private readonly supportedCurrencies: SupportedCurrencies,
    @Inject(FxRateConfigToken) readonly fxConfig: FxRateConfig
  ) {
    super();
  }

  async upsert(loan: DraftMarketLoan): Promise<MarketLoan> {
    const existingLoan = await this.findByKey(loan.contract, loan.loanId);
    if (existingLoan) {
      await this.model.update({ contract: loan.contract, loanId: loan.loanId }, loan);
      return this.model.findOneOrFail({ where: { contract: loan.contract, loanId: loan.loanId } });
    }
    return this.model.save(this.model.create(loan));
  }

  async updateByKey(contract: string, loanId: string, update: Partial<MarketLoan>): Promise<MarketLoan> {
    await this.model.update({ contract, loanId }, update);
    return this.model.findOneOrFail({ where: { contract, loanId } });
  }

  async updateByIds(ids: number[], update: Partial<MarketLoan>): Promise<void> {
    await this.model.update(ids, update);
  }

  async findByKey(contract: string, loanId: string): Promise<MarketLoan | null> {
    return this.model.findOne({ where: { contract, loanId } });
  }

  async findById(id: number): Promise<MarketLoan | null> {
    return this.model.findOne({ where: { id } });
  }

  async find(params: Partial<FindConditions>, options: FindOptions<MarketLoanSortKeys>): Promise<MarketLoan[]> {
    const query = this.buildFindQuery(params, this.tableAlias).skip(options.skip).take(options.limit);
    const sortBy = ((): string => {
      switch (options.sort?.by) {
        case 'collectionName':
          const collectionNameAlias = `${this.tableAlias}_collection_name`.toLowerCase();
          const hasAssetsJoin = query.expressionMap.joinAttributes.some(
            joinAttribute => joinAttribute.alias.name === this.assetsJoinAlias
          );
          if (hasAssetsJoin) {
            query.leftJoin(
              COLLECTION_TABLE_NAME,
              'sort_collections',
              `sort_collections.id = ${this.assetsJoinAlias}.collection_id`
            );
          } else {
            query.leftJoin(`${this.tableAlias}.asset`, 'sort_assets');
            query.leftJoin(
              COLLECTION_TABLE_NAME,
              'sort_collections',
              'sort_collections.id = sort_assets.collection_id'
            );
          }
          query.addSelect('sort_collections.name', collectionNameAlias);
          return collectionNameAlias;
        case 'principal':
        case 'repayment':
          const amountActualUsdAlias = `${this.tableAlias}_${options.sort.by}_actual_usd`.toLowerCase();
          this.addUsdConversionSelect(query, `${options.sort.by}_eth`, amountActualUsdAlias);
          return amountActualUsdAlias;
        case 'repaymentMax':
          const repaymentMaxAlias = `${this.tableAlias}_repaymentmax_actual_usd`;
          this.addUsdConversionSelect(query, 'repayment_max_eth', repaymentMaxAlias);
          return repaymentMaxAlias;
        default:
          const columnMetadata = this.model.metadata.findColumnWithPropertyName(options.sort?.by || 'startedAt')!;
          return `${this.tableAlias}.${columnMetadata.propertyName}`;
      }
    })();

    return query.addOrderBy(sortBy, options.sort?.direction || 'ASC', 'NULLS LAST').getMany();
  }

  async count(params: Partial<FindConditions>): Promise<number> {
    return this.buildFindQuery(params, this.tableAlias).getCount();
  }

  async findOverdue(
    protocol: MarketLoanProtocol,
    currentTime: Date,
    options: Omit<FindOptions<MarketLoanSortKeys>, 'sort'>
  ): Promise<MarketLoan[]> {
    // Perpetual loans (Blur Blend, pre-auction) carry due_at=NULL. Auto-defaulting them via the
    // cron would be wrong — they have no maturity yet. Only loans whose lender triggered a
    // StartAuction (real +36h deadline) should be picked up here.
    return this.model.find({
      where: {
        status: MarketLoanStatus.Active,
        protocol,
        dueAt: And(Not(IsNull()), LessThan(currentTime))
      },
      skip: options.skip,
      take: options.limit
    });
  }

  async *iterateUnsettled(protocol: MarketLoanProtocol): AsyncGenerator<MarketLoan> {
    yield* this._iterate(async opts =>
      this.model.find({
        where: { status: In([MarketLoanStatus.Active, MarketLoanStatus.Defaulted]), protocol },
        relations: ['asset', 'asset.collection'],
        order: { id: 'ASC' },
        skip: opts.skip,
        take: opts.limit
      })
    );
  }

  async *iterateByContract(contract: string): AsyncGenerator<MarketLoan> {
    yield* this._iterate(async opts =>
      this.model.find({
        where: { contract: contract.toLowerCase() },
        order: { loanId: 'ASC', id: 'ASC' },
        skip: opts.skip,
        take: opts.limit
      })
    );
  }

  async findMaturing(protocol: MarketLoanProtocol, dueAtBefore: Date): Promise<MarketLoan[]> {
    return this.model.find({
      where: { status: MarketLoanStatus.Active, protocol, dueAt: LessThanOrEqual(dueAtBefore) }
    });
  }

  private addUsdConversionSelect(query: SelectQueryBuilder<MarketLoan>, column: string, alias: string): void {
    const selectQuery = `case
        when ("${this.tableAlias}"."currency" = '${this.supportedCurrencies.getByTicker(Ticker.WETH).contractAddress}')
        then "${this.tableAlias}"."${column}" * ${this.fxConfig.ethusdt}
        else "${this.tableAlias}"."${column}"
      end`.replace(/\s+/g, ' ');
    query.addSelect(selectQuery, alias);
  }

  private buildFindQuery(params: Partial<FindConditions>, tableAlias: string): SelectQueryBuilder<MarketLoan> {
    const where: FindOptionsWhere<MarketLoan> = {};
    if (isArray(params.statuses) && params.statuses.length > 0) where.status = In(params.statuses);
    if (isDate(params.dueAtBefore)) where.dueAt = LessThanOrEqual(params.dueAtBefore);
    if (isString(params.borrower)) where.borrower = Equal(params.borrower);
    if (isString(params.lender)) where.lender = Equal(params.lender);
    if (isArray(params.currencies) && params.currencies.length > 0) where.currency = In(params.currencies);
    if (isArray(params.protocols) && params.protocols.length > 0) where.protocol = In(params.protocols);
    if (isArray(params.nftIds) && params.nftIds.length > 0) where.nftTokenId = In(params.nftIds);
    if (isArray(params.nftContracts) && params.nftContracts.length > 0) {
      where.nftContract = In(params.nftContracts.map(addr => addr.toLowerCase()));
    }

    const hasCollectionIds = isArray(params.collectionIds) && params.collectionIds.length > 0;
    const query = this.model.createQueryBuilder(tableAlias);
    if (hasCollectionIds) {
      query.innerJoin(`${tableAlias}.asset`, this.assetsJoinAlias);
    }
    query.where(where);

    if (isArray(params.wallets) && params.wallets.length > 0) {
      const lcWallets = params.wallets.map(w => w.toLowerCase());
      query.andWhere(
        new Brackets(qb => {
          qb.where({ lender: In(lcWallets) }).orWhere({ borrower: In(lcWallets) });
        })
      );
    }

    if (hasCollectionIds) {
      query.andWhere(`${this.assetsJoinAlias}.collection_id IN (:...collectionIds)`, {
        collectionIds: params.collectionIds
      });
    }

    return query;
  }

  async *iterateActiveByProtocol(protocol: MarketLoanProtocol): AsyncGenerator<MarketLoan> {
    yield* this._iterate(async opts =>
      this.model.find({
        where: { status: MarketLoanStatus.Active, protocol },
        order: { id: 'ASC' },
        ...opts
      })
    );
  }

  async *iterateBorrowersByProtocol(protocol: MarketLoanProtocol, borrowers: string[]): AsyncGenerator<MarketLoan> {
    yield* this._iterate(async opts =>
      this.model.find({
        where: { protocol, borrower: In(borrowers) },
        order: { id: 'ASC' },
        ...opts
      })
    );
  }
}
