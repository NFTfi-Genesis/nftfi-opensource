import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Renegotiation,
  RenegotiationParty,
  RenegotiationRepository,
  RenegotiationStatus
} from '@nftfi.api/repositories/postgres/renegotiation';
import { createTypeormQueryBuilderMock, createTypeormRepositoryMock, MockTypeormRepository } from '../factories';
import { buildPostgresRenegotiation } from './renegotiation.factory';

type UpdateQueryBuilderMock = {
  update: jest.Mock;
  set: jest.Mock;
  where: jest.Mock;
  andWhere: jest.Mock;
  whereInIds: jest.Mock;
  setParameters: jest.Mock;
  execute: jest.Mock;
};

const createUpdateQueryBuilderMock = (
  executeResult: { affected?: number } = { affected: 1 }
): UpdateQueryBuilderMock => {
  const qb: UpdateQueryBuilderMock = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    whereInIds: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(executeResult)
  };
  return qb;
};

const createSelectQueryBuilderMock = (): ReturnType<typeof createTypeormQueryBuilderMock<Renegotiation>> & {
  innerJoinAndSelect: jest.Mock;
  getOne: jest.Mock;
} => {
  const base = createTypeormQueryBuilderMock<Renegotiation>();
  return Object.assign(base, {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    getOne: jest.fn()
  });
};

describe(RenegotiationRepository.name, () => {
  let repository: RenegotiationRepository;
  let model: MockTypeormRepository<Renegotiation>;

  beforeEach(async () => {
    jest.resetAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-04-10T00:00:00.000Z'));

    const moduleRef = await Test.createTestingModule({
      providers: [
        RenegotiationRepository,
        {
          provide: getRepositoryToken(Renegotiation),
          useValue: createTypeormRepositoryMock<Renegotiation>()
        }
      ]
    }).compile();

    repository = moduleRef.get(RenegotiationRepository);
    model = moduleRef.get(getRepositoryToken(Renegotiation));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe(RenegotiationRepository.prototype.create.name, () => {
    it('persists the draft via create and save with reload', async () => {
      const draft = {
        status: RenegotiationStatus.Active,
        party: RenegotiationParty.Borrower,
        borrower: '0xborrower',
        lender: '0xlender',
        lenderNonce: null,
        duration: 86400,
        renegotiationFee: '10000000000000000',
        expiresAt: new Date('2099-06-19T23:30:18.000Z'),
        signature: null,
        message: null,
        loan: { id: 42 }
      };
      const built = buildPostgresRenegotiation({ id: 7 });
      const saved = buildPostgresRenegotiation({ id: 7 });
      model.create.mockReturnValue(built);
      model.save.mockResolvedValue(saved);

      const result = await repository.create(draft);

      expect(model.create).toHaveBeenCalledWith(draft);
      expect(model.save).toHaveBeenCalledWith(built, { reload: true });
      expect(result).toBe(saved);
    });
  });

  describe(RenegotiationRepository.prototype.findById.name, () => {
    it('returns the renegotiation joined with its loan', async () => {
      const entity = buildPostgresRenegotiation({ id: 42 });
      model.findOne.mockResolvedValue(entity);

      const result = await repository.findById(42);

      expect(model.findOne).toHaveBeenCalledWith({ where: { id: 42 }, relations: { loan: true } });
      expect(result).toBe(entity);
    });

    it('returns null when not found', async () => {
      model.findOne.mockResolvedValue(null);

      expect(await repository.findById(999)).toBeNull();
    });
  });

  describe(RenegotiationRepository.prototype.findActiveByLoan.name, () => {
    it('joins the loan, filters by active+not-deleted, and orders by created_at ASC', async () => {
      const qb = createSelectQueryBuilderMock();
      const entities = [buildPostgresRenegotiation({ id: 1 }), buildPostgresRenegotiation({ id: 2 })];
      qb.getMany.mockResolvedValue(entities);
      model.createQueryBuilder.mockReturnValue(qb as never);

      const result = await repository.findActiveByLoan('99', '0xCONTRACT');

      expect(model.createQueryBuilder).toHaveBeenCalledWith('renegotiations');
      expect(qb.innerJoinAndSelect).toHaveBeenCalledWith('renegotiations.loan', 'loan');
      expect(qb.where).toHaveBeenCalledWith('loan.loan_id = :loanId', { loanId: '99' });
      expect(qb.andWhere).toHaveBeenCalledWith('loan.contract = :contract', { contract: '0xcontract' });
      expect(qb.andWhere).toHaveBeenCalledWith('renegotiations.status = :status', {
        status: RenegotiationStatus.Active
      });
      expect(qb.andWhere).toHaveBeenCalledWith('renegotiations.deleted_at IS NULL');
      expect(qb.addOrderBy).toHaveBeenCalledWith('renegotiations.created_at', 'ASC');
      expect(result).toBe(entities);
    });
  });

  describe(RenegotiationRepository.prototype.findActiveByLoanAndParty.name, () => {
    it('adds a party filter and returns a single entity', async () => {
      const qb = createSelectQueryBuilderMock();
      const entity = buildPostgresRenegotiation({ id: 3 });
      qb.getOne.mockResolvedValue(entity);
      model.createQueryBuilder.mockReturnValue(qb as never);

      const result = await repository.findActiveByLoanAndParty('1', '0xcontract', RenegotiationParty.Lender);

      expect(qb.andWhere).toHaveBeenCalledWith('renegotiations.party = :party', { party: RenegotiationParty.Lender });
      expect(result).toBe(entity);
    });
  });

  describe(RenegotiationRepository.prototype.countBy.name, () => {
    it('returns the count from the built query', async () => {
      const qb = createSelectQueryBuilderMock();
      qb.getCount!.mockResolvedValue(7);
      model.createQueryBuilder.mockReturnValue(qb as never);

      const result = await repository.countBy({});

      expect(model.createQueryBuilder).toHaveBeenCalledWith('renegotiations');
      expect(qb.innerJoinAndSelect).toHaveBeenCalledWith('renegotiations.loan', 'loan');
      expect(qb.withDeleted).not.toHaveBeenCalled();
      expect(result).toBe(7);
    });

    it('calls withDeleted when requested', async () => {
      const qb = createSelectQueryBuilderMock();
      qb.getCount!.mockResolvedValue(0);
      model.createQueryBuilder.mockReturnValue(qb as never);

      await repository.countBy({ withDeleted: true });

      expect(qb.withDeleted).toHaveBeenCalledTimes(1);
    });

    it('applies all supported scalar filters', async () => {
      const qb = createSelectQueryBuilderMock();
      qb.getCount!.mockResolvedValue(0);
      model.createQueryBuilder.mockReturnValue(qb as never);

      await repository.countBy({
        id: 5,
        loanId: '99',
        contract: '0xCONTRACT',
        borrower: '0xBORROWER',
        lender: '0xLENDER',
        party: RenegotiationParty.Borrower,
        status: RenegotiationStatus.Active
      });

      expect(qb.andWhere).toHaveBeenCalledWith('renegotiations.id = :id', { id: 5 });
      expect(qb.andWhere).toHaveBeenCalledWith('loan.loan_id = :loanId', { loanId: '99' });
      expect(qb.andWhere).toHaveBeenCalledWith('loan.contract = :contract', { contract: '0xcontract' });
      expect(qb.andWhere).toHaveBeenCalledWith('renegotiations.borrower = :borrower', { borrower: '0xborrower' });
      expect(qb.andWhere).toHaveBeenCalledWith('renegotiations.lender = :lender', { lender: '0xlender' });
      expect(qb.andWhere).toHaveBeenCalledWith('renegotiations.party = :party', { party: RenegotiationParty.Borrower });
      expect(qb.andWhere).toHaveBeenCalledWith('renegotiations.status = :status', {
        status: RenegotiationStatus.Active
      });
    });

    it('applies the statusIn array filter and skips empty arrays', async () => {
      const qb = createSelectQueryBuilderMock();
      qb.getCount!.mockResolvedValue(0);
      model.createQueryBuilder.mockReturnValue(qb as never);

      await repository.countBy({ statusIn: [RenegotiationStatus.Active, RenegotiationStatus.Accepted] });

      expect(qb.andWhere).toHaveBeenCalledWith('renegotiations.status IN (:...statusIn)', {
        statusIn: [RenegotiationStatus.Active, RenegotiationStatus.Accepted]
      });
    });

    it('skips the statusIn filter when the array is empty', async () => {
      const qb = createSelectQueryBuilderMock();
      qb.getCount!.mockResolvedValue(0);
      model.createQueryBuilder.mockReturnValue(qb as never);

      await repository.countBy({ statusIn: [] });

      expect(qb.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('renegotiations.status IN'),
        expect.anything()
      );
    });
  });

  describe(RenegotiationRepository.prototype.findSortPaginateBy.name, () => {
    it('paginates, sorts by the requested column, and returns rows', async () => {
      const qb = createSelectQueryBuilderMock();
      const rows = [buildPostgresRenegotiation({ id: 1 })];
      qb.getMany!.mockResolvedValue(rows);
      model.createQueryBuilder.mockReturnValue(qb as never);
      (model.metadata!.findColumnWithPropertyName as jest.Mock).mockReturnValue({ propertyName: 'expiresAt' });

      const result = await repository.findSortPaginateBy(
        {},
        { skip: 10, limit: 5, sort: { by: 'expiresAt', direction: 'ASC' } }
      );

      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(5);
      expect(qb.orderBy).toHaveBeenCalledWith('renegotiations.expiresAt', 'ASC', 'NULLS LAST');
      expect(qb.addOrderBy).toHaveBeenCalledWith('renegotiations.id', 'ASC');
      expect(result).toBe(rows);
    });

    it('defaults sort to createdAt DESC when no sort is provided', async () => {
      const qb = createSelectQueryBuilderMock();
      qb.getMany!.mockResolvedValue([]);
      model.createQueryBuilder.mockReturnValue(qb as never);
      (model.metadata!.findColumnWithPropertyName as jest.Mock).mockReturnValue({ propertyName: 'createdAt' });

      await repository.findSortPaginateBy({}, { skip: 0, limit: 10 });

      expect(qb.orderBy).toHaveBeenCalledWith('renegotiations.createdAt', 'DESC', 'NULLS LAST');
    });

    it('falls back to createdAt when column metadata is missing', async () => {
      const qb = createSelectQueryBuilderMock();
      qb.getMany!.mockResolvedValue([]);
      model.createQueryBuilder.mockReturnValue(qb as never);
      (model.metadata!.findColumnWithPropertyName as jest.Mock).mockReturnValue(undefined);

      await repository.findSortPaginateBy({}, { skip: 0, limit: 10, sort: { by: 'expiresAt', direction: 'ASC' } });

      expect(qb.orderBy).toHaveBeenCalledWith('renegotiations.createdAt', 'ASC', 'NULLS LAST');
    });
  });

  describe(RenegotiationRepository.prototype.nullSignaturesByLoanAndParty.name, () => {
    it('returns 0 without running the update when no rows match', async () => {
      const selectQb = createSelectQueryBuilderMock();
      selectQb.getRawMany!.mockResolvedValue([]);
      model.createQueryBuilder.mockReturnValue(selectQb as never);

      const result = await repository.nullSignaturesByLoanAndParty('1', '0xcontract', RenegotiationParty.Lender);

      expect(result).toBe(0);
      expect(selectQb.andWhere).toHaveBeenCalledWith('renegotiations.party = :party', {
        party: RenegotiationParty.Lender
      });
      expect(selectQb.andWhere).toHaveBeenCalledWith('renegotiations.signature IS NOT NULL');
    });

    it('nulls signatures on the matched ids and returns the affected count', async () => {
      const selectQb = createSelectQueryBuilderMock();
      selectQb.getRawMany!.mockResolvedValue([{ id: 3 }, { id: 4 }]);
      const updateQb = createUpdateQueryBuilderMock({ affected: 2 });
      model.createQueryBuilder.mockReturnValueOnce(selectQb as never).mockReturnValueOnce(updateQb as never);

      const result = await repository.nullSignaturesByLoanAndParty('1', '0xcontract', RenegotiationParty.Lender);

      expect(updateQb.set).toHaveBeenCalledWith({ signature: null });
      expect(updateQb.whereInIds).toHaveBeenCalledWith([3, 4]);
      expect(result).toBe(2);
    });
  });

  describe(RenegotiationRepository.prototype.acceptActiveByLoan.name, () => {
    it('returns 0 without running the update when no rows match', async () => {
      const selectQb = createSelectQueryBuilderMock();
      selectQb.getRawMany!.mockResolvedValue([]);
      model.createQueryBuilder.mockReturnValue(selectQb as never);

      const result = await repository.acceptActiveByLoan('1', '0xcontract');

      expect(result).toBe(0);
    });

    it('sets status=Accepted and signature=null on the matched ids', async () => {
      const selectQb = createSelectQueryBuilderMock();
      selectQb.getRawMany!.mockResolvedValue([{ id: 5 }, { id: 6 }]);
      const updateQb = createUpdateQueryBuilderMock({ affected: 2 });
      model.createQueryBuilder.mockReturnValueOnce(selectQb as never).mockReturnValueOnce(updateQb as never);

      const result = await repository.acceptActiveByLoan('1', '0xcontract');

      expect(updateQb.set).toHaveBeenCalledWith({ status: RenegotiationStatus.Accepted, signature: null });
      expect(updateQb.whereInIds).toHaveBeenCalledWith([5, 6]);
      expect(result).toBe(2);
    });
  });

  describe(RenegotiationRepository.prototype.softDeleteCancelled.name, () => {
    it('writes the cancelled soft-delete fields by id and returns the affected count', async () => {
      const qb = createUpdateQueryBuilderMock({ affected: 1 });
      model.createQueryBuilder.mockReturnValue(qb as never);

      const result = await repository.softDeleteCancelled(11);

      expect(qb.set).toHaveBeenCalledWith({
        deletedAt: new Date('2024-04-10T00:00:00.000Z'),
        deletedReason: 'CANCELLED',
        signature: null,
        status: RenegotiationStatus.Cancelled
      });
      expect(qb.where).toHaveBeenCalledWith('id = :id', { id: 11 });
      expect(qb.andWhere).toHaveBeenCalledWith('deleted_at IS NULL');
      expect(result).toBe(1);
    });

    it('returns zero when affected is undefined', async () => {
      const qb = createUpdateQueryBuilderMock({});
      model.createQueryBuilder.mockReturnValue(qb as never);

      const result = await repository.softDeleteCancelled(11);

      expect(result).toBe(0);
    });
  });

  describe(RenegotiationRepository.prototype.softDeleteReplaced.name, () => {
    it('writes the replaced soft-delete fields by id', async () => {
      const qb = createUpdateQueryBuilderMock({ affected: 1 });
      model.createQueryBuilder.mockReturnValue(qb as never);

      const result = await repository.softDeleteReplaced(13);

      expect(qb.set).toHaveBeenCalledWith({
        deletedAt: new Date('2024-04-10T00:00:00.000Z'),
        deletedReason: 'REPLACED',
        signature: null,
        status: RenegotiationStatus.Replaced
      });
      expect(qb.where).toHaveBeenCalledWith('id = :id', { id: 13 });
      expect(result).toBe(1);
    });
  });

  describe(RenegotiationRepository.prototype.softDeleteByLoanEnded.name, () => {
    it('returns 0 when there are no active rows for the loan', async () => {
      const selectQb = createSelectQueryBuilderMock();
      selectQb.getRawMany!.mockResolvedValue([]);
      model.createQueryBuilder.mockReturnValue(selectQb as never);

      const result = await repository.softDeleteByLoanEnded('1', '0xcontract');

      expect(result).toBe(0);
    });

    it('writes the LoanEnded soft-delete fields without changing status', async () => {
      const selectQb = createSelectQueryBuilderMock();
      selectQb.getRawMany!.mockResolvedValue([{ id: 21 }]);
      const updateQb = createUpdateQueryBuilderMock({ affected: 1 });
      model.createQueryBuilder.mockReturnValueOnce(selectQb as never).mockReturnValueOnce(updateQb as never);

      const result = await repository.softDeleteByLoanEnded('1', '0xcontract');

      expect(updateQb.set).toHaveBeenCalledWith({
        deletedAt: new Date('2024-04-10T00:00:00.000Z'),
        deletedReason: 'LOAN_ENDED',
        signature: null
      });
      expect(updateQb.whereInIds).toHaveBeenCalledWith([21]);
      expect(result).toBe(1);
    });
  });

  describe(RenegotiationRepository.prototype.softDeleteExpired.name, () => {
    it('expires rows whose loan group has all active rows past their expiresAt', async () => {
      const subQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        having: jest.fn().mockReturnThis(),
        getQuery: jest.fn().mockReturnValue('SELECT rsub.loan_id FROM renegotiations rsub WHERE ...'),
        getParameters: jest.fn().mockReturnValue({ status: 'active', now: new Date('2024-04-10T00:00:00.000Z') })
      };
      const updateQb = createUpdateQueryBuilderMock({ affected: 3 });
      model.createQueryBuilder.mockReturnValueOnce(subQb as never).mockReturnValueOnce(updateQb as never);

      const result = await repository.softDeleteExpired();

      expect(model.createQueryBuilder).toHaveBeenCalledWith('rsub');
      expect(subQb.select).toHaveBeenCalledWith('rsub.loan_id', 'loan_id');
      expect(subQb.groupBy).toHaveBeenCalledWith('rsub.loan_id');
      expect(subQb.having).toHaveBeenCalledWith('MAX(rsub.expires_at) < :now', {
        now: new Date('2024-04-10T00:00:00.000Z')
      });
      expect(updateQb.set).toHaveBeenCalledWith({
        deletedAt: new Date('2024-04-10T00:00:00.000Z'),
        deletedReason: 'EXPIRED',
        signature: null,
        status: RenegotiationStatus.Expired
      });
      expect(updateQb.where).toHaveBeenCalledWith('status = :status', { status: RenegotiationStatus.Active });
      expect(updateQb.andWhere).toHaveBeenCalledWith('deleted_at IS NULL');
      expect(updateQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('loan_id IN (SELECT rsub.loan_id FROM renegotiations rsub')
      );
      expect(updateQb.setParameters).toHaveBeenCalledWith({
        status: 'active',
        now: new Date('2024-04-10T00:00:00.000Z')
      });
      expect(result).toBe(3);
    });

    it('returns zero when affected is undefined', async () => {
      const subQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        having: jest.fn().mockReturnThis(),
        getQuery: jest.fn().mockReturnValue(''),
        getParameters: jest.fn().mockReturnValue({})
      };
      const updateQb = createUpdateQueryBuilderMock({});
      model.createQueryBuilder.mockReturnValueOnce(subQb as never).mockReturnValueOnce(updateQb as never);

      const result = await repository.softDeleteExpired();

      expect(result).toBe(0);
    });
  });
});
