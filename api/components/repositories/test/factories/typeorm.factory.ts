import { Repository, SelectQueryBuilder } from 'typeorm';

export type MockTypeormRepository<T extends object> = jest.Mocked<Repository<T>> & {
  metadata?: { findColumnWithPropertyName: jest.Mock };
};

export const createTypeormRepositoryMock = <T extends object>(
  overrides: Partial<MockTypeormRepository<T>> = {}
): MockTypeormRepository<T> =>
  ({
    upsert: jest.fn(),
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    softDelete: jest.fn(),
    createQueryBuilder: jest.fn(),
    metadata: { findColumnWithPropertyName: jest.fn() },
    ...overrides
  } as MockTypeormRepository<T>);

export const createTypeormQueryBuilderMock = <T>(): jest.Mocked<Partial<SelectQueryBuilder<T>>> => ({
  expressionMap: { joinAttributes: [] } as SelectQueryBuilder<T>['expressionMap'],
  distinct: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orWhere: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  withDeleted: jest.fn().mockReturnThis(),
  getMany: jest.fn(),
  getCount: jest.fn(),
  getRawMany: jest.fn()
});
