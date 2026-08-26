import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { getEthersToken } from 'nestjs-ethers';
import { Interface } from '@ethersproject/abi';
import { Block } from '@ethersproject/providers';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { EthersFacade } from '@nftfi.api/modules/ethers-provider';
import { ConfigToken } from '@nftfi.api/modules/ethers-observer';
import { RunningEvent } from '@nftfi.api/modules/ethers-observer/contract';
import { ContractRepository } from '../../src/ethers-observer/contract.repository';
import { Contract } from '../../src/ethers-observer';
import { buildContractType } from './factories';

jest.mock('@ethersproject/contracts', () => ({
  Contract: class {
    address: string;
    ABI: Interface;

    constructor(address: string, ABI: Interface) {
      this.address = address;
      this.ABI = ABI;
    }
  }
}));

describe(ContractRepository.name, () => {
  let service: ContractRepository;
  let cacheManager: Cache;
  let ethersFacade: EthersFacade;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            (): object => ({
              ethereum: {
                replay: {
                  chunkSize: 10
                }
              }
            })
          ]
        })
      ],
      providers: [
        ContractRepository,
        { provide: EthersFacade, useValue: { getBlock: jest.fn() } },
        { provide: CACHE_MANAGER, useValue: { set: jest.fn(), get: jest.fn(), del: jest.fn() } },
        { provide: getEthersToken(), useValue: { getBlock: jest.fn() } },
        {
          provide: ConfigToken,
          useValue: {
            replay: {
              enabled: true,
              chunkSize: 10
            }
          }
        }
      ]
    }).compile();

    service = moduleRef.get(ContractRepository);
    cacheManager = moduleRef.get(CACHE_MANAGER);
    ethersFacade = moduleRef.get(EthersFacade);
  });

  describe(ContractRepository.prototype.create.name, () => {
    it('should throw an error if the contract does not contain an address in its metadata', () => {
      const metatype = class {} as unknown as typeof Contract;
      Reflect.defineMetadata('@nftfi.api:ethers-contract:builderr', { ABI: [] }, metatype);

      expect(() => service.create(metatype)).toThrow(
        `Contract ${metatype.name} does not contain an address in its metadata`
      );
    });

    it('marks contract as replayed when global replay is disabled', () => {
      service['config'].replay.enabled = false;
      const metatype = buildContractType({ address: '0x123', ABI: {} as Interface });

      const entity = service.create(metatype);

      expect(entity.replayed).toBe(true);
    });
  });

  describe(ContractRepository.prototype.findOrCreate.name, () => {
    it('should return an existing contract instance if it exists', () => {
      const metatype = buildContractType();
      const entity = service.create(metatype);

      const fnCreate = jest.spyOn(service, 'create');
      service.findOrCreate(metatype);

      expect(entity).toBe(entity);
      expect(fnCreate).not.toHaveBeenCalled();
    });

    it('should create a new contract instance if it does not exist', () => {
      const fnCreate = jest.spyOn(service, 'create');
      const metatype = buildContractType();
      const entity = service.findOrCreate(metatype);

      expect(entity).toBe(entity);
      expect(fnCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe(ContractRepository.prototype.findByAddress.name, () => {
    it('should return the contract instance by address', () => {
      const metatype = buildContractType({ address: '0x123', ABI: {} as Interface });
      const entity = service.create(metatype);

      const foundEntity = service.findByAddress('0x123');

      expect(foundEntity).toBe(entity);
    });

    it('should return undefined if no contract instance is found by address', () => {
      const metatype = buildContractType({ address: '0x123', ABI: {} as Interface });
      service.create(metatype);

      const foundEntity = service.findByAddress('0x456');

      expect(foundEntity).toBeUndefined();
    });
  });

  describe(ContractRepository.prototype.getLastEventBlockTime.name, () => {
    it('should return the block time of the last event', async () => {
      const metatype = buildContractType({ address: '0x123', ABI: {} as Interface });
      const entity = service.create(metatype);

      const fnGetCache = jest.spyOn(cacheManager, 'get').mockResolvedValue(123);
      const fnGetBlock = jest
        .spyOn(ethersFacade, 'getBlock')
        .mockResolvedValue({ timestamp: new Date('2025-01-01T00:00:00Z').getTime() / 1000 } as Block);

      const result = await service.getLastEventBlockTime(entity);

      expect(result).toEqual(new Date('2025-01-01T00:00:00Z'));
      expect(fnGetCache).toHaveBeenCalledTimes(1);
      expect(fnGetCache).toHaveBeenCalledWith('ethers-observer:replay:0x123');
      expect(fnGetBlock).toHaveBeenCalledTimes(1);
      expect(fnGetBlock).toHaveBeenCalledWith(123);
    });

    it('should return start of the era date if no replay block is found', async () => {
      const metatype = buildContractType({ address: '0x123', ABI: {} as Interface });
      const entity = service.create(metatype);

      const fnGetCache = jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      const fnGetBlock = jest.spyOn(ethersFacade, 'getBlock');

      const result = await service.getLastEventBlockTime(entity);

      expect(result).toEqual(new Date('1970-01-01T00:00:00.000Z'));
      expect(fnGetCache).toHaveBeenCalledTimes(1);
      expect(fnGetCache).toHaveBeenCalledWith('ethers-observer:replay:0x123');
      expect(fnGetBlock).not.toHaveBeenCalled();
    });

    it('should return the start of the era date if no onchain block is found', async () => {
      const metatype = buildContractType({ address: '0x123', ABI: {} as Interface });
      const entity = service.create(metatype);

      const fnGetCache = jest.spyOn(cacheManager, 'get').mockResolvedValue(123);
      const fnGetBlock = jest.spyOn(ethersFacade, 'getBlock').mockResolvedValue(null);

      const result = await service.getLastEventBlockTime(entity);

      expect(result).toEqual(new Date('1970-01-01T00:00:00.000Z'));
      expect(fnGetCache).toHaveBeenCalledTimes(1);
      expect(fnGetCache).toHaveBeenCalledWith('ethers-observer:replay:0x123');
      expect(fnGetBlock).toHaveBeenCalledTimes(1);
      expect(fnGetBlock).toHaveBeenCalledWith(123);
    });
  });

  describe(ContractRepository.prototype.updateReplayBlock.name, () => {
    it('should update the replay block in the cache', async () => {
      const metatype = buildContractType({ address: '0x123', ABI: {} as Interface });
      const entity = service.create(metatype);

      const fnSetCache = jest.spyOn(cacheManager, 'set');

      await service.updateReplayBlock(entity, 123);

      expect(fnSetCache).toHaveBeenCalledTimes(1);
      expect(fnSetCache).toHaveBeenCalledWith('ethers-observer:replay:0x123', 123, 604800000);
    });
  });

  describe(ContractRepository.prototype.deleteReplayBlock.name, () => {
    it('should delete the replay block from the cache', async () => {
      const metatype = buildContractType({ address: '0x123', ABI: {} as Interface });
      const entity = service.create(metatype);

      const fnDelCache = jest.spyOn(cacheManager, 'del');

      await service.deleteReplayBlock(entity);

      expect(fnDelCache).toHaveBeenCalledTimes(1);
      expect(fnDelCache).toHaveBeenCalledWith('ethers-observer:replay:0x123');
    });

    it('uses service label if present', async () => {
      const metatype = buildContractType({ address: '0x123', ABI: {} as Interface });
      const entity = service.create(metatype);

      const fnDelCache = jest.spyOn(cacheManager, 'del');

      service['config'].label = 'test';
      await service.deleteReplayBlock(entity);

      expect(fnDelCache).toHaveBeenCalledTimes(1);
      expect(fnDelCache).toHaveBeenCalledWith('ethers-observer:replay-test:0x123');
    });
  });

  describe(ContractRepository.prototype.getReplayCursorDate.name, () => {
    it('should return the earliest date from all event block times', async () => {
      const metatype = buildContractType({ address: '0x123', ABI: {} as Interface });
      const entity = service.create(metatype);

      entity._runningEvents = {
        Transfer: { fragment: { name: 'Transfer' } },
        Approval: { fragment: { name: 'Approval' } }
      } as unknown as Record<string, RunningEvent>;

      const fnGetLastEventBlockTime = jest
        .spyOn(service, 'getLastEventBlockTime')
        .mockResolvedValueOnce(new Date('2025-01-01T00:00:00Z'))
        .mockResolvedValueOnce(new Date('2024-12-31T23:59:59Z'));

      const result = await service.getReplayCursorDate(entity);

      expect(result).toEqual(new Date('2024-12-31T23:59:59Z'));
      expect(fnGetLastEventBlockTime).toHaveBeenCalledTimes(2);
    });

    it('should return the start of the era date if no events are found', async () => {
      const metatype = buildContractType({ address: '0x123', ABI: {} as Interface });
      const entity = service.create(metatype);

      entity._runningEvents = {
        Transfer: { fragment: { name: 'Transfer' } },
        Approval: { fragment: { name: 'Approval' } }
      } as unknown as Record<string, RunningEvent>;

      jest.spyOn(service, 'getLastEventBlockTime').mockResolvedValueOnce(new Date('1970-01-01T00:00:00.000Z'));

      const result = await service.getReplayCursorDate(entity);

      expect(result).toEqual(new Date('1970-01-01T00:00:00.000Z'));
    });

    it('should return the start of the era date if no valid dates are found', async () => {
      const metatype = buildContractType({ address: '0x123', ABI: {} as Interface });
      const entity = service.create(metatype);

      entity._runningEvents = {
        Transfer: { fragment: { name: 'Transfer' } },
        Approval: { fragment: { name: 'Approval' } }
      } as unknown as Record<string, RunningEvent>;

      const fnGetLastEventBlockTime = jest
        .spyOn(service, 'getLastEventBlockTime')
        .mockResolvedValueOnce(new Date('invalid-date') as unknown as Date)
        .mockResolvedValueOnce(new Date('invalid-date') as unknown as Date);

      const result = await service.getReplayCursorDate(entity);

      expect(result).toEqual(new Date('1970-01-01T00:00:00.000Z'));
      expect(fnGetLastEventBlockTime).toHaveBeenCalledTimes(2);
    });
  });
});
