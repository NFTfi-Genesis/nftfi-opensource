import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NftfiSmartNftId, NftfiSmartNftIdRepository } from '@nftfi.api/repositories/postgres/nftfi-smart-nft-id';
import { MarketLoan } from '@nftfi.api/repositories/postgres/market-loan';
import { createTypeormRepositoryMock, MockTypeormRepository } from '../factories';

describe(NftfiSmartNftIdRepository.name, () => {
  let repository: NftfiSmartNftIdRepository;
  let model: MockTypeormRepository<NftfiSmartNftId>;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        NftfiSmartNftIdRepository,
        {
          provide: getRepositoryToken(NftfiSmartNftId),
          useValue: createTypeormRepositoryMock<NftfiSmartNftId>()
        }
      ]
    }).compile();

    repository = moduleRef.get(NftfiSmartNftIdRepository);
    model = moduleRef.get(getRepositoryToken(NftfiSmartNftId));
  });

  describe(NftfiSmartNftIdRepository.prototype.create.name, () => {
    it('should upsert a smart nft id record for a loan', async () => {
      const loan = { id: 42 } as MarketLoan;
      model.upsert.mockResolvedValue(undefined as never);

      await repository.create(loan, '12345');

      expect(model.upsert).toHaveBeenCalledWith(
        { loan: { id: 42 }, smartNftId: '12345' },
        {
          conflictPaths: ['loan'],
          skipUpdateIfNoValuesChanged: true
        }
      );
    });

    it('should handle different smart nft id values', async () => {
      const loan = { id: 100 } as MarketLoan;
      model.upsert.mockResolvedValue(undefined as never);

      await repository.create(loan, '999999999');

      expect(model.upsert).toHaveBeenCalledWith(
        { loan: { id: 100 }, smartNftId: '999999999' },
        {
          conflictPaths: ['loan'],
          skipUpdateIfNoValuesChanged: true
        }
      );
    });
  });

  describe(NftfiSmartNftIdRepository.prototype.findBySmartNftId.name, () => {
    it('should return the record when found', async () => {
      const record = {
        id: 1,
        smartNftId: '12345',
        loan: { id: 42 } as MarketLoan,
        createdAt: new Date('2024-01-01')
      } as NftfiSmartNftId;
      model.findOne.mockResolvedValue(record);

      const result = await repository.findBySmartNftId('12345');

      expect(result).toBe(record);
      expect(model.findOne).toHaveBeenCalledWith({
        where: { smartNftId: '12345' },
        relations: ['loan']
      });
    });

    it('should return null when not found', async () => {
      model.findOne.mockResolvedValue(null);

      const result = await repository.findBySmartNftId('nonexistent');

      expect(result).toBeNull();
      expect(model.findOne).toHaveBeenCalledWith({
        where: { smartNftId: 'nonexistent' },
        relations: ['loan']
      });
    });
  });
});
