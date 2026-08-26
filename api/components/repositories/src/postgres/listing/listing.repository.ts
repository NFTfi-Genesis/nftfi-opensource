import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Equal, FindOptionsWhere, In, Repository as RepositoryType, SelectQueryBuilder } from 'typeorm';
import { isString, isNumber, isArray } from 'lodash';
import { Repository } from '../repository';
import { FindOptions } from '../types';
import { COLLECTION_ASSET_TABLE_NAME } from '../collection-asset/collection-asset.types';
import { Listing } from './listing.entity';
import { DraftListing, FindConditions, ListingSortKeys } from './listing.types';

@Injectable()
export class ListingRepository extends Repository {
  private readonly tableAlias = 'listings';

  constructor(@InjectRepository(Listing) private readonly model: RepositoryType<Listing>) {
    super();
  }

  async create(data: DraftListing): Promise<Listing> {
    const entity = this.model.create(data);
    return this.model.save(entity, { reload: true });
  }

  async update(id: number, data: Partial<Listing>): Promise<Listing> {
    await this.model.update(id, data);
    return this.model.findOneOrFail({ where: { id } });
  }

  async softDelete(id: number, reason: string): Promise<void> {
    await this.model.update(id, { deletedReason: reason, deletedAt: new Date() });
  }

  async find(params: Partial<FindConditions>, options: FindOptions<ListingSortKeys>): Promise<Listing[]> {
    const query = this.buildFindQuery(params, this.tableAlias).skip(options.skip).take(options.limit);

    const sortBy = ((): string => {
      const columnMetadata = this.model.metadata.findColumnWithPropertyName(options.sort?.by || 'createdAt');
      return `${this.tableAlias}.${columnMetadata.propertyName}`;
    })();

    return query.addOrderBy(sortBy, options.sort?.direction || 'DESC', 'NULLS LAST').getMany();
  }

  async count(params: Partial<FindConditions>): Promise<number> {
    return this.buildFindQuery(params, this.tableAlias).getCount();
  }

  async *iterateAll(): AsyncGenerator<Listing> {
    yield* this._iterate(async opts =>
      this.model.find({
        order: { id: 'ASC' },
        ...opts
      })
    );
  }

  async findByAsset(nftContract: string, nftTokenId: string): Promise<Listing | null> {
    return this.model.findOne({ where: { nftContract, nftTokenId }, withDeleted: false });
  }

  private buildFindQuery(params: Partial<FindConditions>, tableAlias: string): SelectQueryBuilder<Listing> {
    const conditions: FindOptionsWhere<Listing> = {};

    if (isString(params.borrower)) {
      conditions.borrower = Equal(params.borrower);
    }
    if (isString(params.currency)) {
      conditions.currency = Equal(params.currency);
    }
    if (isNumber(params.duration)) {
      conditions.duration = Equal(params.duration);
    }
    if (isArray(params.nftContracts) && params.nftContracts.length > 0) {
      conditions.nftContract = In(params.nftContracts);
    }

    if (isArray(params.collectionIds) && params.collectionIds.length > 0) {
      return this.model
        .createQueryBuilder(tableAlias)
        .innerJoin(COLLECTION_ASSET_TABLE_NAME, 'assets', `assets.id = ${tableAlias}.asset_id`)
        .where(conditions)
        .andWhere('assets.collection_id IN (:...collectionIds)', {
          collectionIds: params.collectionIds
        });
    }

    return this.model.createQueryBuilder(tableAlias).where(conditions);
  }
}
