import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository as RepositoryType } from 'typeorm';
import { Repository } from '../repository';
import { FxRate } from './fx-rate.entity';

export type DraftFxRate = Pick<FxRate, 'symbol' | 'rate' | 'createdAt'>;

@Injectable()
export class FxRateRepository extends Repository {
  constructor(@InjectRepository(FxRate) private readonly model: RepositoryType<FxRate>) {
    super();
  }

  async upsert(data: DraftFxRate[]): Promise<void> {
    await this.model.upsert(data, {
      conflictPaths: ['symbol', 'createdAt'],
      skipUpdateIfNoValuesChanged: true
    });
  }

  findLatest(symbol: string): Promise<FxRate> {
    return this.model.findOne({
      where: { symbol },
      order: {
        createdAt: 'DESC'
      }
    });
  }

  findToDate(symbol: string, date: Date): Promise<FxRate> {
    return this.model
      .createQueryBuilder('fx_rate')
      .where('fx_rate.symbol = :symbol', { symbol })
      .orderBy('ABS(EXTRACT(EPOCH FROM (fx_rate.created_at - :date)))', 'ASC')
      .addOrderBy('fx_rate.created_at', 'DESC')
      .setParameter('date', date)
      .getOne();
  }

  async *iterateDailyLatest(symbol: string): AsyncGenerator<FxRate> {
    yield* super._iterate(opts =>
      this.model
        .createQueryBuilder('fx_rate')
        .distinctOn(['DATE(fx_rate.created_at)'])
        .where('fx_rate.symbol = :symbol', { symbol })
        .orderBy('DATE(fx_rate.created_at)', 'ASC')
        .addOrderBy('fx_rate.created_at', 'DESC')
        .offset(opts.skip)
        .limit(opts.limit)
        .getMany()
    );
  }
}
