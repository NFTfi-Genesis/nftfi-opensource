import { SelectQueryBuilder } from 'typeorm';
import { FxRate } from '../../src/postgres/fx-rate';

export const buildPostgresFxRate = (overrides: Partial<FxRate> = {}): FxRate =>
  ({
    id: 1,
    symbol: 'ETH/USD',
    rate: 2000,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides
  } as FxRate);

export const createFxRateQueryBuilderMock = (): jest.Mocked<Partial<SelectQueryBuilder<FxRate>>> => ({
  distinctOn: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  setParameter: jest.fn().mockReturnThis(),
  getMany: jest.fn(),
  getOne: jest.fn()
});
