import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptions, In, IsNull, Not, Repository as RepositoryType } from 'typeorm';
import { Repository } from '../repository';
import { CollectionAsset } from './collection-asset.entity';
import { CollectionAssetDraft, CollectionAssetUpdatePayload, FindFilters } from './collection-asset.types';

@Injectable()
export class CollectionAssetRepository extends Repository {
  private readonly relations = ['collection'];

  constructor(@InjectRepository(CollectionAsset) private readonly model: RepositoryType<CollectionAsset>) {
    super();
  }

  async create(asset: CollectionAssetDraft): Promise<CollectionAsset> {
    const entity = this.model.create(asset);
    return this.model.save(entity, { reload: true });
  }

  async updateByIds(ids: number[], data: Partial<CollectionAssetUpdatePayload>): Promise<void> {
    await this.model.update({ id: In(ids) }, data);
  }

  find(filters: FindFilters, options: FindOptions): Promise<CollectionAsset[]> {
    return this.model.find({ where: filters, skip: options.skip, take: options.limit, relations: this.relations });
  }

  findByKeys(filter: FindFilters): Promise<CollectionAsset[]> {
    return this.model.find({ where: filter, relations: this.relations });
  }

  findByKey(contract: string, tokenId: string): Promise<CollectionAsset> {
    return this.model.findOne({ where: { contract, tokenId }, relations: this.relations });
  }

  async *iterateOverEmptyImageEntries(): AsyncGenerator<CollectionAsset> {
    yield* this._iterate(async opts =>
      this.model.find({
        where: [{ imageSmallUrl: IsNull() }, { imageMediumUrl: IsNull() }],
        order: { id: 'ASC' },
        ...opts
      })
    );
  }

  async *iterateOverNonEmptyImageEntries(): AsyncGenerator<CollectionAsset> {
    yield* this._iterate(async opts =>
      this.model.find({
        where: { imageSmallUrl: Not(IsNull()), imageMediumUrl: Not(IsNull()) },
        order: { id: 'ASC' },
        ...opts
      })
    );
  }
}
