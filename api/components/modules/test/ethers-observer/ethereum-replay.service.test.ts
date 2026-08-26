import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Block } from '@ethersproject/providers';
import { buildEventArchive } from '@nftfi.api/repositories/factories';
import { HealthModule } from '@nftfi.api/modules/health';
import { EthersFacade } from '@nftfi.api/modules/ethers-provider';
import { ContractRepository } from '@nftfi.api/modules/ethers-observer';
import {
  EventArchiveRepository,
  EventArchiveRepositoryToken
} from '@nftfi.api/modules/ethers-observer/event-archive.types';
import { EthereumReplayService } from '../../src/ethers-observer/replay-strategies/ethereum-replay.service';
import { ContractExplorerService } from '../../src/ethers-observer/contract-explorer.service';
import { ConfigToken } from '../../src/ethers-observer/config.provider';
import { buildContract, buildEventLog, buildRegisteredHandler } from './factories';

jest.mock('@ethersproject/contracts', () => ({
  Contract: class {}
}));

describe(EthereumReplayService.name, () => {
  let service: EthereumReplayService;
  let eventArchiveRepository: EventArchiveRepository;
  let contractExplorerService: ContractExplorerService;
  let contractRepository: ContractRepository;
  let ethersFacade: EthersFacade;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(jest.fn());
    jest.spyOn(Logger.prototype, 'error').mockImplementation(jest.fn());
  });

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [HealthModule],
      providers: [
        EthereumReplayService,
        {
          provide: EventArchiveRepositoryToken,
          useValue: {
            findLatestBlockByContract: jest.fn(),
            findEarliestBlockByContract: jest.fn(),
            findByMetadata: jest.fn().mockResolvedValue([])
          }
        },
        {
          provide: ContractExplorerService,
          useValue: {
            getRegisteredHandlerGroups: jest.fn().mockReturnValue([]),
            callHandler: jest.fn()
          } as Partial<ContractExplorerService>
        },
        {
          provide: ContractRepository,
          useValue: {
            updateReplayBlock: jest.fn(),
            getReplayBlock: jest.fn()
          }
        },
        { provide: EthersFacade, useValue: { getLatestBlock: jest.fn() } },
        {
          provide: ConfigToken,
          useValue: {
            replay: {
              chunkSize: 10
            }
          }
        }
      ]
    }).compile();

    service = moduleRef.get(EthereumReplayService);
    eventArchiveRepository = moduleRef.get(EventArchiveRepositoryToken);
    contractExplorerService = moduleRef.get(ContractExplorerService);
    contractRepository = moduleRef.get(ContractRepository);
    ethersFacade = moduleRef.get(EthersFacade);

    jest.spyOn(contractExplorerService, 'callHandler').mockResolvedValue(true);
  });

  describe(EthereumReplayService.prototype['onModuleInit'].name, () => {
    it('logs module initialization', () => {
      service.onModuleInit();
      expect(Logger.prototype.log).toHaveBeenCalledWith('Module initialized');
    });
  });

  describe(EthereumReplayService.prototype.replayEvents.name, () => {
    it('replays events for registered handlers by chunks and using repository data', async () => {
      const fnUpdateBlock = jest.spyOn(contractRepository, 'updateReplayBlock');
      jest
        .spyOn(contractRepository, 'getReplayBlock')
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(25)
        .mockResolvedValueOnce(30);
      jest.spyOn(eventArchiveRepository, 'findEarliestBlockByContract').mockResolvedValue(
        buildEventArchive({
          name: 'Transfer',
          blockNumber: 15,
          contract: '0x0',
          index: 0,
          txHash: '06241fae72a6774cd82d729f77ed78e1',
          emittedAt: new Date('2024-04-10T21:29:34Z'),
          args: { _account: '0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5', _amount: '3' }
        })
      );
      const contract = buildContract({ address: '0x1234', metadata: { replay: { enabled: false, startAt: 15 } } });
      jest.spyOn(contractExplorerService, 'getRegisteredHandlerGroups').mockReturnValue([
        [
          buildRegisteredHandler({
            contract,
            eventName: 'Transfer',
            params: {}
          })
        ]
      ]);
      jest.spyOn(ethersFacade, 'getLatestBlock').mockResolvedValue({ number: 30 } as Block);
      const fnEventsQuery = jest.spyOn(contract, 'queryFilter').mockResolvedValue([]);

      await service.replayEvents();

      expect(fnUpdateBlock).toHaveBeenCalledTimes(2);
      expect(fnUpdateBlock).toHaveBeenCalledWith(contract, 25);
      expect(fnUpdateBlock).toHaveBeenCalledWith(contract, 30);
      expect(fnEventsQuery.mock.calls).toEqual([
        ['Transfer', 15, 25],
        ['Transfer', 25, 30]
      ]);
    });

    it('skips handlers if start block is greater than end block', async () => {
      const contract = buildContract({ address: '0x1234', metadata: { replay: { enabled: false, startAt: 0 } } });
      const fnCacheGet = jest.spyOn(contractRepository, 'getReplayBlock').mockResolvedValueOnce(30);
      jest.spyOn(contractRepository, 'updateReplayBlock');
      jest.spyOn(ethersFacade, 'getLatestBlock').mockResolvedValue({ number: 10 } as Block);
      jest
        .spyOn(contractExplorerService, 'getRegisteredHandlerGroups')
        .mockReturnValue([[buildRegisteredHandler({ contract, eventName: 'Transfer' })]]);
      const fnEventsQuery = jest.spyOn(contract, 'queryFilter').mockResolvedValue([]);

      await service.replayEvents();

      expect(fnEventsQuery).not.toHaveBeenCalled();
      expect(fnCacheGet).toHaveBeenCalledWith(contract);
    });

    it('replays events using latest known event block number', async () => {
      const contract = buildContract({ address: '0x1234' });
      const fnCacheGet = jest
        .spyOn(contractRepository, 'getReplayBlock')
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(30);
      jest.spyOn(contractRepository, 'updateReplayBlock');
      jest.spyOn(ethersFacade, 'getLatestBlock').mockResolvedValue({ number: 30 } as Block);
      jest
        .spyOn(contractExplorerService, 'getRegisteredHandlerGroups')
        .mockReturnValue([[buildRegisteredHandler({ contract, eventName: 'Transfer' })]]);
      const fnEventsQuery = jest.spyOn(contract, 'queryFilter').mockResolvedValue([]);

      await service.replayEvents();

      expect(fnEventsQuery.mock.calls).toEqual([
        ['Transfer', 0, 10],
        ['Transfer', 10, 20],
        ['Transfer', 20, 30]
      ]);
      expect(fnCacheGet).toHaveBeenCalledWith(contract);
    });

    it('replays events and retries contract query if request failed', async () => {
      const contract = buildContract({ address: '0x1234' });
      const fnCacheGet = jest
        .spyOn(contractRepository, 'getReplayBlock')
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(30);
      jest.spyOn(contractRepository, 'updateReplayBlock');
      jest.spyOn(ethersFacade, 'getLatestBlock').mockResolvedValue({ number: 30 } as Block);
      jest
        .spyOn(contractExplorerService, 'getRegisteredHandlerGroups')
        .mockReturnValue([[buildRegisteredHandler({ contract, eventName: 'Transfer' })]]);
      const fnEventsQuery = jest
        .spyOn(contract, 'queryFilter')
        .mockRejectedValueOnce(new Error())
        .mockResolvedValue([]);

      await service.replayEvents();

      expect(fnEventsQuery.mock.calls).toEqual([
        ['Transfer', 0, 10],
        ['Transfer', 0, 10],
        ['Transfer', 10, 20],
        ['Transfer', 20, 30]
      ]);
      expect(fnCacheGet).toHaveBeenCalledWith(contract);
    });

    it('calls original handler if events for replay are found', async () => {
      const fnHandler = jest.fn();
      const contract = buildContract({
        address: '0x1234',
        interface: { getEvent: jest.fn().mockReturnValue({ inputs: [] }) }
      });
      const fnFindExisting = jest.spyOn(eventArchiveRepository, 'findByMetadata').mockResolvedValue([]);
      const eventLog11 = buildEventLog({ logIndex: 9371, blockNumber: 7, event: 'Test' });
      const eventLog12 = buildEventLog({ logIndex: 9471, blockNumber: 7, event: 'Test' });
      const eventLog13 = buildEventLog({ logIndex: 1371, blockNumber: 7, event: 'Test' });
      const eventLog2 = buildEventLog({ logIndex: 1739, blockNumber: 11, event: 'Test' });
      const fnCacheSet = jest.spyOn(contractRepository, 'updateReplayBlock');
      jest
        .spyOn(contractRepository, 'getReplayBlock')
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(12);
      jest.spyOn(ethersFacade, 'getLatestBlock').mockResolvedValue({ number: 12 } as Block);
      jest.spyOn(contractExplorerService, 'callHandler').mockResolvedValue(true);
      jest
        .spyOn(contractExplorerService, 'getRegisteredHandlerGroups')
        .mockReturnValue([[buildRegisteredHandler({ handler: fnHandler, contract, eventName: 'Test' })]]);
      jest
        .spyOn(contract, 'queryFilter')
        .mockResolvedValueOnce([eventLog11, eventLog12, eventLog13])
        .mockResolvedValueOnce([eventLog2]);

      await service.replayEvents();

      expect(fnFindExisting).toHaveBeenNthCalledWith(1, [
        {
          blockNumber: 7,
          contract: '0x0',
          index: 9371,
          name: 'Test'
        },
        {
          blockNumber: 7,
          contract: '0x0',
          index: 9471,
          name: 'Test'
        },
        {
          blockNumber: 7,
          contract: '0x0',
          index: 1371,
          name: 'Test'
        }
      ]);
      expect(fnFindExisting).toHaveBeenNthCalledWith(2, [
        {
          blockNumber: 11,
          contract: '0x0',
          index: 1739,
          name: 'Test'
        }
      ]);
      expect(contractExplorerService.callHandler).toHaveBeenCalledWith(
        fnHandler,
        { '@test': { index: 0, data: 'test' } },
        contract,
        eventLog13
      );
      expect(contractExplorerService.callHandler).toHaveBeenCalledWith(
        fnHandler,
        { '@test': { index: 0, data: 'test' } },
        contract,
        eventLog11
      );
      expect(contractExplorerService.callHandler).toHaveBeenCalledWith(
        fnHandler,
        { '@test': { index: 0, data: 'test' } },
        contract,
        eventLog12
      );
      expect(contractExplorerService.callHandler).toHaveBeenCalledWith(
        fnHandler,
        { '@test': { index: 0, data: 'test' } },
        contract,
        eventLog2
      );
      expect(fnCacheSet).toHaveBeenCalledTimes(6);
      expect(fnCacheSet).toHaveBeenCalledWith(contract, 7);
      expect(fnCacheSet).toHaveBeenCalledWith(contract, 7);
      expect(fnCacheSet).toHaveBeenCalledWith(contract, 7);
      expect(fnCacheSet).toHaveBeenCalledWith(contract, 7);
      expect(fnCacheSet).toHaveBeenCalledWith(contract, 10);
      expect(fnCacheSet).toHaveBeenCalledWith(contract, 11);
      expect(fnCacheSet).toHaveBeenCalledWith(contract, 12);
    });
  });

  describe(EthereumReplayService.prototype['getContractStartBlock'].name, () => {
    it('uses archived event block and updates replay block when cache is empty', async () => {
      const contract = buildContract({ address: '0x1234' });
      jest.spyOn(contractRepository, 'getReplayBlock').mockResolvedValueOnce(undefined);
      const archivedEvent = buildEventArchive({ contract: '0x1234', blockNumber: 42 });
      const fnFindLatest = jest
        .spyOn(eventArchiveRepository, 'findLatestBlockByContract')
        .mockResolvedValue(archivedEvent);
      const fnUpdateBlock = jest.spyOn(contractRepository, 'updateReplayBlock');

      const result = await service['getContractStartBlock'](contract);

      expect(result).toBe(42);
      expect(fnFindLatest).toHaveBeenCalledWith('0x1234');
      expect(fnUpdateBlock).toHaveBeenCalledWith(contract, 42);
    });

    it('falls back to contract replay startAt when no cached or archived block exists', async () => {
      const contract = buildContract({ address: '0x1234', metadata: { replay: { startAt: 17, enabled: false } } });
      jest.spyOn(contractRepository, 'getReplayBlock').mockResolvedValueOnce(undefined);
      jest.spyOn(eventArchiveRepository, 'findLatestBlockByContract').mockResolvedValue(null);

      const result = await service['getContractStartBlock'](contract);

      expect(result).toBe(17);
    });

    it('falls back to zero when replay metadata is unavailable', async () => {
      const contract = buildContract({ address: '0x1234' });
      (contract as unknown as { metadata?: { replay?: { startAt?: number } } }).metadata = undefined;
      jest.spyOn(contractRepository, 'getReplayBlock').mockResolvedValueOnce(undefined);
      jest.spyOn(eventArchiveRepository, 'findLatestBlockByContract').mockResolvedValue(null);

      const result = await service['getContractStartBlock'](contract);

      expect(result).toBe(0);
    });
  });

  describe(EthereumReplayService.prototype['findEvents'].name, () => {
    it('keeps events when archived entries are present but not played', async () => {
      const contract = buildContract({
        address: '0x1234',
        interface: { getEvent: jest.fn().mockReturnValue({ inputs: [] }) }
      });
      const eventLog = buildEventLog({ logIndex: 1, blockNumber: 7, event: 'Test', address: '0x1234' });
      jest.spyOn(contract, 'queryFilter').mockResolvedValueOnce([eventLog]);
      jest.spyOn(eventArchiveRepository, 'findByMetadata').mockResolvedValue([
        {
          contract: '0x1234',
          name: 'Test',
          blockNumber: 7,
          index: 1,
          played: false
        } as unknown as EventArchiveRepository['findByMetadata'] extends (...args: unknown[]) => Promise<(infer T)[]>
          ? T
          : never
      ]);

      const result = await service['findEvents'](contract, ['Test'], 0, 10);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ blockNumber: 7, logIndex: 1, event: 'Test' });
    });
  });

  it('filters out already played events and calls original handler with the rest', async () => {
    const fnHandler = jest.fn();
    const contract = buildContract({
      address: '0x1234',
      interface: { getEvent: jest.fn().mockReturnValue({ inputs: [] }) },
      metadata: { replay: { enabled: false, startAt: 0 } }
    });
    const eventLog11 = buildEventLog({ logIndex: 9371, blockNumber: 7, event: 'Test' });
    const eventLog12 = buildEventLog({ logIndex: 9471, blockNumber: 7, event: 'Test' });
    const eventLog13 = buildEventLog({ logIndex: 1371, blockNumber: 7, event: 'Test' });
    const eventLog2 = buildEventLog({ logIndex: 1739, blockNumber: 11, event: 'Test' });
    const fnFindExisting = jest.spyOn(eventArchiveRepository, 'findByMetadata').mockResolvedValue([
      {
        contract: eventLog11.address,
        blockNumber: eventLog11.blockNumber,
        index: eventLog11.logIndex,
        name: eventLog11.event,
        emittedAt: new Date(),
        txHash: eventLog11.transactionHash,
        played: true,
        args: ['123', '0x123', '0x456']
      },
      {
        contract: eventLog12.address,
        blockNumber: eventLog12.blockNumber,
        index: eventLog12.logIndex,
        name: eventLog12.event,
        emittedAt: new Date(),
        txHash: eventLog12.transactionHash,
        played: true,
        args: ['123', '0x123', '0x456']
      }
    ]);
    const fnCacheSet = jest.spyOn(contractRepository, 'updateReplayBlock');
    jest
      .spyOn(contractRepository, 'getReplayBlock')
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(12);
    jest.spyOn(ethersFacade, 'getLatestBlock').mockResolvedValue({ number: 12 } as Block);
    const fnCallHandler = jest.spyOn(contractExplorerService, 'callHandler').mockResolvedValue(true);
    jest
      .spyOn(contractExplorerService, 'getRegisteredHandlerGroups')
      .mockReturnValue([[buildRegisteredHandler({ handler: fnHandler, contract, eventName: 'Test' })]]);
    jest
      .spyOn(contract, 'queryFilter')
      .mockResolvedValueOnce([eventLog11, eventLog12, eventLog13])
      .mockResolvedValueOnce([eventLog2]);

    await service.replayEvents();

    expect(fnFindExisting).toHaveBeenNthCalledWith(1, [
      {
        blockNumber: 7,
        contract: '0x0',
        index: 9371,
        name: 'Test'
      },
      {
        blockNumber: 7,
        contract: '0x0',
        index: 9471,
        name: 'Test'
      },
      {
        blockNumber: 7,
        contract: '0x0',
        index: 1371,
        name: 'Test'
      }
    ]);
    expect(fnFindExisting).toHaveBeenNthCalledWith(2, [
      {
        blockNumber: 11,
        contract: '0x0',
        index: 1739,
        name: 'Test'
      }
    ]);
    expect(fnCallHandler).toHaveBeenCalledTimes(2);
    expect(fnCallHandler).toHaveBeenCalledWith(
      fnHandler,
      { '@test': { index: 0, data: 'test' } },
      contract,
      eventLog13
    );
    expect(fnCallHandler).toHaveBeenCalledWith(fnHandler, { '@test': { index: 0, data: 'test' } }, contract, eventLog2);
    expect(fnCacheSet).toHaveBeenCalledTimes(4);
    expect(fnCacheSet).toHaveBeenCalledWith(contract, 7);
    expect(fnCacheSet).toHaveBeenCalledWith(contract, 7);
    expect(fnCacheSet).toHaveBeenCalledWith(contract, 10);
    expect(fnCacheSet).toHaveBeenCalledWith(contract, 11);
    expect(fnCacheSet).toHaveBeenCalledWith(contract, 12);
  });
});
