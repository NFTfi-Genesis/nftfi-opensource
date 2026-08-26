import { Equal, In, IsNull, Not, Repository as RepositoryType, SelectQueryBuilder } from 'typeorm';
import { isArray, isBoolean, isNumber } from 'lodash';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptions } from '../types';
import { Repository } from '../repository';
import { MARKET_LOAN_TABLE_NAME, MarketLoanStatus } from '../market-loan/market-loan.types';
import { COLLECTION_ASSET_TABLE_NAME } from '../collection-asset/collection-asset.types';
import { Collection } from './collection.entity';
import {
  CollectionSortKeys,
  CollectionUpdatePayload,
  CollectionDraft,
  FindFilters,
  FindByBorrowerFilters
} from './collection.types';
import { CollectionStats } from './collection-stats.entity';

@Injectable()
export class CollectionRepository extends Repository {
  private readonly tableAlias = 'collections';

  constructor(@InjectRepository(Collection) private readonly model: RepositoryType<Collection>) {
    super();
  }

  create(data: CollectionDraft): Promise<Collection> {
    return this.model.save(this.model.create(data));
  }

  find(filters: FindFilters, options?: FindOptions<CollectionSortKeys>): Promise<Collection[]> {
    const query = this.buildFindQuery(filters);
    if (isNumber(options?.skip)) query.skip(options.skip);
    if (isNumber(options?.limit)) query.take(options.limit);

    const sortBy = ((): string => {
      switch (options?.sort?.by) {
        default:
          const columnMetadata = this.model.metadata.findColumnWithPropertyName(options?.sort?.by || 'releasedAt');
          return `${this.tableAlias}.${columnMetadata.propertyName}`;
      }
    })();
    const sortDirection = options?.sort?.direction || 'ASC';

    return query.addOrderBy(sortBy, sortDirection, 'NULLS LAST').getMany();
  }

  findByContract(contract: string): Promise<Collection[]> {
    return this.model.find({ where: { contract } });
  }

  findByBorrower(
    borrower: string,
    filters: FindByBorrowerFilters = {},
    options?: Pick<FindOptions<CollectionSortKeys>, 'skip' | 'limit'>
  ): Promise<Collection[]> {
    const query = this.buildFindByBorrowerQuery(borrower, filters);

    if (isNumber(options?.skip)) query.skip(options.skip);
    if (isNumber(options?.limit)) query.take(options.limit);

    return query.getMany();
  }

  countByBorrower(borrower: string, filters: FindByBorrowerFilters = {}): Promise<number> {
    return this.buildFindByBorrowerQuery(borrower, filters).getCount();
  }

  buildFindByBorrowerQuery(borrower: string, filters: FindByBorrowerFilters = {}): SelectQueryBuilder<Collection> {
    const mloansAlias = 'market_active_loans';
    const query = this.model
      .createQueryBuilder(this.tableAlias)
      .innerJoin(COLLECTION_ASSET_TABLE_NAME, 'assets', `assets.collection_id = ${this.tableAlias}.id`)
      .innerJoin(
        MARKET_LOAN_TABLE_NAME,
        mloansAlias,
        `${mloansAlias}.status = '${MarketLoanStatus.Active}'
          AND ${mloansAlias}.asset_id = assets.id
        `
      )
      .andWhere(`${mloansAlias}.borrower = :borrower`, { borrower });

    if (isArray(filters.protocols) && filters.protocols.length > 0) {
      query.andWhere(`${mloansAlias}.protocol IN (:...protocols)`, { protocols: filters.protocols });
    }

    return query;
  }

  async *iterate(
    constraint: FindFilters,
    options: Pick<FindOptions<CollectionSortKeys>, 'sort'>
  ): AsyncGenerator<Collection> {
    yield* this._iterate(async opts => this.find(constraint, { ...options, ...opts }));
  }

  async *iterateOverNonEmptyImageEntries(): AsyncGenerator<Collection> {
    yield* this._iterate(async opts =>
      this.model.find({
        where: { imageUrl: Not(IsNull()) },
        order: { releasedAt: 'ASC' },
        ...opts
      })
    );
  }

  async *iterateOverEmptyImageEntries(): AsyncGenerator<Collection> {
    yield* this._iterate(async opts => {
      return this.model.find({
        where: { imageUrl: IsNull() },
        order: { releasedAt: 'ASC' },
        ...opts
      });
    });
  }

  async *iterateOverEntriesWithNpfSlug(): AsyncGenerator<Collection> {
    yield* this._iterate(async opts =>
      this.model.find({
        where: { npfSlug: Not(Equal(null)) },
        order: { releasedAt: 'ASC' },
        ...opts
      })
    );
  }

  async *iterateOverEntriesWithEmptyNpfSlug(): AsyncGenerator<Collection> {
    yield* this._iterate(async opts =>
      this.model.find({
        where: { npfSlug: Equal(null) },
        order: { releasedAt: 'ASC' },
        ...opts
      })
    );
  }

  count(filters: FindFilters): Promise<number> {
    const query = this.buildFindQuery(filters);
    return query.getCount();
  }

  async updateByIds(ids: number[], data: CollectionUpdatePayload): Promise<void> {
    await this.model.update({ id: In(ids) }, data);
  }

  private buildFindQuery(params: Partial<FindFilters>): SelectQueryBuilder<Collection> {
    const query = this.model.createQueryBuilder(this.tableAlias);

    if (isArray(params.contracts) && params.contracts.length > 0) {
      query.andWhere(`${this.tableAlias}.contract IN (:...contracts)`, { contracts: params.contracts });
    }

    if (isBoolean(params.whitelisted)) {
      query.andWhere(`${this.tableAlias}.whitelisted = :whitelisted`, { whitelisted: params.whitelisted });
    }

    if (isArray(params.ids) && params.ids.length > 0) {
      query.andWhere(`${this.tableAlias}.id IN (:...ids)`, { ids: params.ids });
    }

    if (
      isNumber(params.loanTotalUsdMin) ||
      isNumber(params.loanTotalUsdMax) ||
      isNumber(params.loanAvgUsdMin) ||
      isNumber(params.loanAvgUsdMax)
    ) {
      query.innerJoin(CollectionStats, 'stats', `stats.collectionId = ${this.tableAlias}.id`);

      if (isNumber(params.loanTotalUsdMin)) query.andWhere('stats.totalUsd >= :loanTotalUsdMin', params);
      if (isNumber(params.loanTotalUsdMax)) query.andWhere('stats.totalUsd <= :loanTotalUsdMax', params);
      if (isNumber(params.loanAvgUsdMin)) query.andWhere('stats.averageUsd >= :loanAvgUsdMin', params);
      if (isNumber(params.loanAvgUsdMax)) query.andWhere('stats.averageUsd <= :loanAvgUsdMax', params);
    }

    return query;
  }
}
