import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Between, In } from 'typeorm';
import { EthereumEventRepository, EthereumEvent } from '@nftfi.api/repositories/postgres/ethereum-event';
import { createTypeormRepositoryMock, MockTypeormRepository } from '../factories';
import { buildPostgresEthereumEvent } from './ethereum-event.factory';

describe(EthereumEventRepository.name, () => {
  let repository: EthereumEventRepository;
  let model: MockTypeormRepository<EthereumEvent>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        EthereumEventRepository,
        {
          provide: getRepositoryToken(EthereumEvent),
          useValue: createTypeormRepositoryMock<EthereumEvent>()
        }
      ]
    }).compile();

    repository = moduleRef.get(EthereumEventRepository);
    model = moduleRef.get(getRepositoryToken(EthereumEvent));
  });

  describe(EthereumEventRepository.prototype.upsert.name, () => {
    it('maps dto fields and upserts by unique keys', async () => {
      const dto = {
        contract: '0xabc',
        name: 'LoanStarted',
        blockNumber: 12,
        index: 3,
        txHash: '0xtx',
        emittedAt: new Date('2024-01-01T00:00:00.000Z'),
        played: true,
        args: { foo: 'bar' }
      };

      const result = await repository.upsert(dto);

      expect(model.upsert).toHaveBeenCalledWith(
        {
          contract: '0xabc',
          name: 'LoanStarted',
          blockNumber: 12,
          logIndex: 3,
          tx: '0xtx',
          emittedAt: dto.emittedAt,
          played: true,
          args: { foo: 'bar' }
        },
        {
          conflictPaths: ['contract', 'name', 'blockNumber', 'logIndex'],
          skipUpdateIfNoValuesChanged: true
        }
      );
      expect(result).toBe(true);
    });
  });

  describe(EthereumEventRepository.prototype.findByMetadata.name, () => {
    it('converts filters and maps entries', async () => {
      const entry = buildPostgresEthereumEvent();
      model.find.mockResolvedValue([entry]);

      const result = await repository.findByMetadata([
        { contract: '0xabc', name: 'LoanStarted', blockNumber: 12, index: 3 }
      ]);

      expect(model.find).toHaveBeenCalledWith({
        where: [{ contract: '0xabc', name: 'LoanStarted', blockNumber: 12, logIndex: 3 }]
      });
      expect(result).toEqual([
        {
          contract: entry.contract,
          name: entry.name,
          blockNumber: entry.blockNumber,
          txHash: entry.tx,
          index: entry.logIndex,
          emittedAt: entry.emittedAt,
          played: entry.played,
          args: entry.args
        }
      ]);
    });
  });

  describe(EthereumEventRepository.prototype.find.name, () => {
    it('queries by metadata and maps entries', async () => {
      const entry = buildPostgresEthereumEvent();
      model.find.mockResolvedValue([entry]);

      const result = await repository.find({ contract: '0xabc', name: 'LoanStarted' });

      expect(model.find).toHaveBeenCalledWith({ where: { contract: '0xabc', name: 'LoanStarted' } });
      expect(result[0].txHash).toBe(entry.tx);
    });
  });

  describe(EthereumEventRepository.prototype.findEarliestBlockByContract.name, () => {
    it('orders by ascending block number', async () => {
      const entry = buildPostgresEthereumEvent();
      model.findOne.mockResolvedValue(entry);

      const result = await repository.findEarliestBlockByContract('0xabc');

      expect(model.findOne).toHaveBeenCalledWith({
        where: { contract: '0xabc' },
        order: { blockNumber: 'ASC' }
      });
      expect(result.blockNumber).toBe(entry.blockNumber);
    });
  });

  describe(EthereumEventRepository.prototype.findLatestBlockByContract.name, () => {
    it('orders by descending block number', async () => {
      const entry = buildPostgresEthereumEvent();
      model.findOne.mockResolvedValue(entry);

      const result = await repository.findLatestBlockByContract('0xabc');

      expect(model.findOne).toHaveBeenCalledWith({
        where: { contract: '0xabc' },
        order: { blockNumber: 'DESC' }
      });
      expect(result.blockNumber).toBe(entry.blockNumber);
    });

    it('returns null when no entry exists', async () => {
      model.findOne.mockResolvedValue(null);

      const result = await repository.findLatestBlockByContract('0xabc');

      expect(result).toBeNull();
    });
  });

  describe(EthereumEventRepository.prototype.findByContractEvents.name, () => {
    it('filters by contract, event names, and block range', async () => {
      const entry = buildPostgresEthereumEvent();
      model.find.mockResolvedValue([entry]);

      const result = await repository.findByContractEvents('0xabc', ['LoanStarted'], 1, 10);

      expect(model.find).toHaveBeenCalledWith({
        where: {
          contract: '0xabc',
          name: In(['LoanStarted']),
          blockNumber: Between(1, 10)
        },
        order: { blockNumber: 'ASC', logIndex: 'ASC' }
      });
      expect(result[0].index).toBe(entry.logIndex);
    });
  });

  describe(EthereumEventRepository.prototype.findByTxHash.name, () => {
    it('filters by tx hash and orders by block/index', async () => {
      const entry = buildPostgresEthereumEvent();
      model.find.mockResolvedValue([entry]);

      const result = await repository.findByTxHash('0xtx');

      expect(model.find).toHaveBeenCalledWith({
        where: { tx: '0xtx' },
        order: { blockNumber: 'ASC', logIndex: 'ASC' }
      });
      expect(result[0].txHash).toBe(entry.tx);
    });
  });
});
