import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository as RepositoryType, MoreThan } from 'typeorm';
import { Repository } from '../repository';
import { CollectionFloorPrice } from './collection-floor-price.entity';

type DraftPayload = Pick<CollectionFloorPrice, 'collection' | 'valueEth' | 'valueUsd' | 'createdAt'>;

@Injectable()
export class CollectionFloorPriceRepository extends Repository {
  constructor(@InjectRepository(CollectionFloorPrice) private readonly model: RepositoryType<CollectionFloorPrice>) {
    super();
  }

  create(data: DraftPayload[]): Promise<CollectionFloorPrice[]> {
    const entities = this.model.create(data);
    return this.model.save(entities);
  }

  findLatestByCollectionId(collectionId: number): Promise<CollectionFloorPrice> {
    return this.model.findOne({ where: { collection: { id: collectionId } }, order: { createdAt: 'DESC' } });
  }

  findLatestByCollectionIds(collectionIds: number[]): Promise<CollectionFloorPrice[]> {
    if (!collectionIds.length) {
      return Promise.resolve([]);
    }

    const latestByCollectionQuery = this.model
      .createQueryBuilder('latest')
      .select('latest.collection_id', 'collection_id')
      .addSelect('MAX(latest.created_at)', 'created_at')
      .where('latest.collection_id IN (:...collectionIds)', { collectionIds })
      .groupBy('latest.collection_id');

    return this.model
      .createQueryBuilder('cfp')
      .leftJoinAndSelect('cfp.collection', 'collection')
      .innerJoin(
        `(${latestByCollectionQuery.getQuery()})`,
        'latest',
        'latest.collection_id = cfp.collection_id AND latest.created_at = cfp.created_at'
      )
      .setParameters(latestByCollectionQuery.getParameters())
      .orderBy('cfp.created_at', 'DESC')
      .getMany();
  }

  async *iterateByCollectionIdAfterDate(collectionId: number, afterDate: Date): AsyncGenerator<CollectionFloorPrice> {
    yield* this._iterate(opts =>
      this.model.find({
        where: { collection: { id: collectionId }, createdAt: MoreThan(afterDate) },
        order: { createdAt: 'ASC' },
        ...opts
      })
    );
  }
}
