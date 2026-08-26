import { In, Repository as RepositoryType } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from '../repository';
import { CollectionStats } from './collection-stats.entity';

@Injectable()
export class CollectionStatsRepository extends Repository {
  constructor(@InjectRepository(CollectionStats) private readonly model: RepositoryType<CollectionStats>) {
    super();
  }

  findByIds(ids: number[]): Promise<CollectionStats[]> {
    return this.model.find({ where: { collectionId: In(ids) } });
  }
}
