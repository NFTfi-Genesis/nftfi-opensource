import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository as RepositoryType, SelectQueryBuilder } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { isArray, isNumber, isString } from 'lodash';
import { Repository } from '../repository';
import { FindOptions } from '../types';
import { Renegotiation } from './renegotiation.entity';
import {
  DraftRenegotiation,
  FindConditions,
  RenegotiationDeletedReason,
  RenegotiationParty,
  RenegotiationSortKeys,
  RenegotiationStatus
} from './renegotiation.types';

type ActiveLoanFilter = (qb: SelectQueryBuilder<Renegotiation>) => SelectQueryBuilder<Renegotiation>;

@Injectable()
export class RenegotiationRepository extends Repository {
  private readonly tableAlias = 'renegotiations';
  private readonly loanJoinAlias = 'loan';

  constructor(@InjectRepository(Renegotiation) private readonly model: RepositoryType<Renegotiation>) {
    super();
  }

  async create(draft: DraftRenegotiation): Promise<Renegotiation> {
    return this.model.save(this.model.create(draft), { reload: true });
  }

  async findById(id: number): Promise<Renegotiation | null> {
    return this.model.findOne({ where: { id }, relations: { loan: true } });
  }

  async findActiveByLoan(loanId: string, contract: string): Promise<Renegotiation[]> {
    return this.activeByLoanQuery(loanId, contract).addOrderBy(`${this.tableAlias}.created_at`, 'ASC').getMany();
  }

  async findActiveByLoanAndParty(
    loanId: string,
    contract: string,
    party: RenegotiationParty
  ): Promise<Renegotiation | null> {
    return this.activeByLoanQuery(loanId, contract).andWhere(`${this.tableAlias}.party = :party`, { party }).getOne();
  }

  async findSortPaginateBy(
    filters: FindConditions,
    options: FindOptions<RenegotiationSortKeys>
  ): Promise<Renegotiation[]> {
    const query = this.buildFindQuery(filters).skip(options.skip).take(options.limit);
    const direction = options.sort?.direction ?? 'DESC';
    const columnMeta = this.model.metadata.findColumnWithPropertyName((options.sort?.by as string) ?? 'createdAt');
    const sortBy = columnMeta ? `${this.tableAlias}.${columnMeta.propertyName}` : `${this.tableAlias}.createdAt`;
    return query.orderBy(sortBy, direction, 'NULLS LAST').addOrderBy(`${this.tableAlias}.id`, 'ASC').getMany();
  }

  async countBy(filters: FindConditions): Promise<number> {
    return this.buildFindQuery(filters).getCount();
  }

  async nullSignaturesByLoanAndParty(loanId: string, contract: string, party: RenegotiationParty): Promise<number> {
    return this.updateActiveByLoan(loanId, contract, { signature: null }, qb =>
      qb.andWhere(`${this.tableAlias}.party = :party`, { party }).andWhere(`${this.tableAlias}.signature IS NOT NULL`)
    );
  }

  async acceptActiveByLoan(loanId: string, contract: string): Promise<number> {
    return this.updateActiveByLoan(loanId, contract, { status: RenegotiationStatus.Accepted, signature: null });
  }

  async softDeleteCancelled(id: number): Promise<number> {
    return this.softDeleteById(id, RenegotiationDeletedReason.Cancelled, RenegotiationStatus.Cancelled);
  }

  async softDeleteReplaced(id: number): Promise<number> {
    return this.softDeleteById(id, RenegotiationDeletedReason.Replaced, RenegotiationStatus.Replaced);
  }

  async softDeleteByLoanEnded(loanId: string, contract: string): Promise<number> {
    return this.updateActiveByLoan(loanId, contract, this.softDeleteSet(RenegotiationDeletedReason.LoanEnded));
  }

  async softDeleteExpired(): Promise<number> {
    const subQuery = this.model
      .createQueryBuilder('rsub')
      .select('rsub.loan_id', 'loan_id')
      .where('rsub.status = :status', { status: RenegotiationStatus.Active })
      .andWhere('rsub.deleted_at IS NULL')
      .groupBy('rsub.loan_id')
      .having('MAX(rsub.expires_at) < :now', { now: new Date() });

    const result = await this.model
      .createQueryBuilder()
      .update()
      .set(this.softDeleteSet(RenegotiationDeletedReason.Expired, RenegotiationStatus.Expired))
      .where('status = :status', { status: RenegotiationStatus.Active })
      .andWhere('deleted_at IS NULL')
      .andWhere(`loan_id IN (${subQuery.getQuery()})`)
      .setParameters(subQuery.getParameters())
      .execute();
    return result.affected ?? 0;
  }

  private softDeleteSet(
    reason: RenegotiationDeletedReason,
    status?: RenegotiationStatus
  ): QueryDeepPartialEntity<Renegotiation> {
    return {
      deletedAt: new Date(),
      deletedReason: reason,
      signature: null,
      ...(status ? { status } : {})
    };
  }

  private async softDeleteById(
    id: number,
    reason: RenegotiationDeletedReason,
    status: RenegotiationStatus
  ): Promise<number> {
    const result = await this.model
      .createQueryBuilder()
      .update()
      .set(this.softDeleteSet(reason, status))
      .where('id = :id', { id })
      .andWhere('deleted_at IS NULL')
      .execute();
    return result.affected ?? 0;
  }

  private async updateActiveByLoan(
    loanId: string,
    contract: string,
    set: QueryDeepPartialEntity<Renegotiation>,
    extraFilter?: ActiveLoanFilter
  ): Promise<number> {
    const baseQuery = this.activeByLoanQuery(loanId, contract);
    const filtered = extraFilter ? extraFilter(baseQuery) : baseQuery;
    const rows = await filtered.select(`${this.tableAlias}.id`, 'id').getRawMany<{ id: number }>();
    if (!rows.length) return 0;
    const result = await this.model
      .createQueryBuilder()
      .update()
      .set(set)
      .whereInIds(rows.map(row => row.id))
      .execute();
    return result.affected ?? 0;
  }

  private activeByLoanQuery(loanId: string, contract: string): SelectQueryBuilder<Renegotiation> {
    return this.buildLoanQuery(loanId, contract)
      .andWhere(`${this.tableAlias}.status = :status`, { status: RenegotiationStatus.Active })
      .andWhere(`${this.tableAlias}.deleted_at IS NULL`);
  }

  private buildLoanQuery(loanId: string, contract: string): SelectQueryBuilder<Renegotiation> {
    return this.model
      .createQueryBuilder(this.tableAlias)
      .innerJoinAndSelect(`${this.tableAlias}.loan`, this.loanJoinAlias)
      .where(`${this.loanJoinAlias}.loan_id = :loanId`, { loanId })
      .andWhere(`${this.loanJoinAlias}.contract = :contract`, { contract: contract.toLowerCase() });
  }

  private buildFindQuery(filters: FindConditions): SelectQueryBuilder<Renegotiation> {
    const alias = this.tableAlias;
    const query = this.model.createQueryBuilder(alias).innerJoinAndSelect(`${alias}.loan`, this.loanJoinAlias);

    if (filters.withDeleted) {
      query.withDeleted();
    }
    if (isNumber(filters.id)) {
      query.andWhere(`${alias}.id = :id`, { id: filters.id });
    }
    if (isString(filters.loanId)) {
      query.andWhere(`${this.loanJoinAlias}.loan_id = :loanId`, { loanId: filters.loanId });
    }
    if (isString(filters.contract)) {
      query.andWhere(`${this.loanJoinAlias}.contract = :contract`, { contract: filters.contract.toLowerCase() });
    }
    if (isString(filters.borrower)) {
      query.andWhere(`${alias}.borrower = :borrower`, { borrower: filters.borrower.toLowerCase() });
    }
    if (isString(filters.lender)) {
      query.andWhere(`${alias}.lender = :lender`, { lender: filters.lender.toLowerCase() });
    }
    if (isString(filters.party)) {
      query.andWhere(`${alias}.party = :party`, { party: filters.party });
    }
    if (isString(filters.status)) {
      query.andWhere(`${alias}.status = :status`, { status: filters.status });
    }
    if (isArray(filters.statusIn) && filters.statusIn.length > 0) {
      query.andWhere(`${alias}.status IN (:...statusIn)`, { statusIn: filters.statusIn });
    }

    return query;
  }
}
