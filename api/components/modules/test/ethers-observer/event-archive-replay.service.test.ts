import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { Block, TransactionReceipt, TransactionResponse } from '@ethersproject/providers';
import { buildEventArchive } from '@nftfi.api/repositories/factories';
import { HealthModule } from '@nftfi.api/modules/health';
import { EthersFacade } from '@nftfi.api/modules/ethers-provider';
import { ContractRepository, EventArchiveRepository, ReplayEvent } from '@nftfi.api/modules/ethers-observer';
import { EventArchiveRepositoryToken } from '@nftfi.api/modules/ethers-observer/event-archive.types';
import { EventArchiveReplayService } from '../../src/ethers-observer/replay-strategies/event-archive-replay.service';
import { ContractExplorerService } from '../../src/ethers-observer/contract-explorer.service';
import { ConfigToken } from '../../src/ethers-observer/config.provider';
import { buildContract, buildRegisteredHandler } from './factories';

jest.mock('@ethersproject/contracts', () => ({
  Contract: class {}
}));

describe(EventArchiveReplayService.name, () => {
  let service: EventArchiveReplayService;
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
        }),
        HealthModule
      ],
      providers: [
        EventArchiveReplayService,
        {
          provide: EventArchiveRepositoryToken,
          useValue: {
            findLatestBlockByContract: jest.fn(),
            findEarliestBlockByContract: jest.fn(),
            findByContractEvents: jest.fn()
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
        {
          provide: EthersFacade,
          useValue: {
            getBlock: jest.fn(),
            getLatestBlock: jest.fn(),
            getTransaction: jest.fn(),
            getTransactionReceipt: jest.fn()
          }
        },
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

    service = moduleRef.get(EventArchiveReplayService);
    eventArchiveRepository = moduleRef.get(EventArchiveRepositoryToken);
    contractExplorerService = moduleRef.get(ContractExplorerService);
    contractRepository = moduleRef.get(ContractRepository);
    ethersFacade = moduleRef.get(EthersFacade);

    jest.spyOn(contractExplorerService, 'callHandler').mockResolvedValue(true);
  });

  describe(EventArchiveReplayService.prototype.replayEvents.name, () => {
    it('replays events for registered handlers by chunks', async () => {
      jest
        .spyOn(contractRepository, 'getReplayBlock')
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(30);
      const fnUpdateBlock = jest.spyOn(contractRepository, 'updateReplayBlock');
      const contract = buildContract({ address: '0x1234' });
      const fnEmit = jest.spyOn(service.eventListener, 'emit').mockImplementation(jest.fn());
      jest.spyOn(contractExplorerService, 'getRegisteredHandlerGroups').mockReturnValue([
        [
          buildRegisteredHandler({
            contract,
            eventName: 'Transfer',
            params: {}
          })
        ]
      ]);
      const eventArchive1 = buildEventArchive({
        contract: '0x1234',
        name: 'Transfer',
        emittedAt: new Date(),
        blockNumber: 5,
        index: 0,
        txHash: '06241fae72a6774cd82d729f77ed78e1',
        args: {}
      });
      jest
        .spyOn(eventArchiveRepository, 'findByContractEvents')
        .mockResolvedValueOnce([
          { ...eventArchive1, blockNumber: 1 },
          { ...eventArchive1, blockNumber: 2 },
          { ...eventArchive1, blockNumber: 3 }
        ])
        .mockResolvedValue([]);
      jest.spyOn(ethersFacade, 'getLatestBlock').mockResolvedValue({ number: 30 } as Block);

      await service.replayEvents();
      expect(fnUpdateBlock.mock.calls).toEqual([
        [contract, 1],
        [contract, 2],
        [contract, 3],
        [contract, 10],
        [contract, 20],
        [contract, 30]
      ]);
      expect(fnEmit.mock.calls).toEqual([[ReplayEvent.Started], [ReplayEvent.Done]]);
    });

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
      jest.spyOn(eventArchiveRepository, 'findLatestBlockByContract').mockResolvedValue(
        buildEventArchive({
          name: 'Transfer',
          blockNumber: 30,
          contract: '0x0',
          index: 0,
          txHash: '06241fae72a6774cd82d729f77ed78e1',
          emittedAt: new Date('2024-04-10T21:29:34Z'),
          args: {}
        })
      );
      const eventArchive1 = buildEventArchive({
        contract: '0x1234',
        name: 'Transfer',
        emittedAt: new Date(),
        blockNumber: 5,
        index: 0,
        txHash: '06241fae72a6774cd82d729f77ed78e1',
        args: {}
      });
      jest
        .spyOn(eventArchiveRepository, 'findByContractEvents')
        .mockResolvedValueOnce([
          { ...eventArchive1, blockNumber: 15 },
          { ...eventArchive1, blockNumber: 16 },
          { ...eventArchive1, blockNumber: 17 }
        ])
        .mockResolvedValue([]);
      const contract = buildContract({ address: '0x1234' });
      jest.spyOn(contractExplorerService, 'getRegisteredHandlerGroups').mockReturnValue([
        [
          buildRegisteredHandler({
            contract,
            eventName: 'Transfer',
            params: {}
          })
        ]
      ]);

      await service.replayEvents();
      expect(fnUpdateBlock.mock.calls).toEqual([
        [contract, 15],
        [contract, 15],
        [contract, 16],
        [contract, 17],
        [contract, 25],
        [contract, 30]
      ]);
    });
  });

  describe(EventArchiveReplayService.prototype['getContractStartBlock'].name, () => {
    it('falls back to contract replay startAt when no cached or archived block exists', async () => {
      const contract = buildContract({ address: '0x1234', metadata: { replay: { startAt: 17, enabled: false } } });
      jest.spyOn(contractRepository, 'getReplayBlock').mockResolvedValueOnce(undefined);
      jest.spyOn(eventArchiveRepository, 'findEarliestBlockByContract').mockResolvedValue(null);

      const result = await service['getContractStartBlock'](contract);

      expect(result).toBe(17);
    });

    it('falls back to 0 when no cached or archived block exists and no contract replay startAt is set', async () => {
      const contract = buildContract({ address: '0x1234' });
      jest.spyOn(contractRepository, 'getReplayBlock').mockResolvedValueOnce(undefined);
      jest.spyOn(eventArchiveRepository, 'findEarliestBlockByContract').mockResolvedValue(null);

      const result = await service['getContractStartBlock'](contract);

      expect(result).toBe(0);
    });
  });

  describe(EventArchiveReplayService.prototype['findEvents'].name, () => {
    it('should find events by contract and event name', async () => {
      const contract = buildContract({ address: '0x1234' });
      const events = [
        buildEventArchive({
          contract: '0x1234',
          name: 'Transfer',
          emittedAt: new Date(),
          blockNumber: 5,
          index: 0,
          txHash: '06241fae72a6774cd82d729f77ed78e1',
          args: {}
        })
      ];
      jest.spyOn(eventArchiveRepository, 'findByContractEvents').mockResolvedValue(events);
      const fnGetBlock = jest.spyOn(ethersFacade, 'getBlock').mockResolvedValue({ timestamp: 123 } as Block);
      const fnGetTransaction = jest
        .spyOn(ethersFacade, 'getTransaction')
        .mockResolvedValue({ chainId: 1 } as TransactionResponse);
      const fnGetTransactionReceipt = jest
        .spyOn(ethersFacade, 'getTransactionReceipt')
        .mockResolvedValue({ blockHash: '0x0' } as TransactionReceipt);

      const result = await service['findEvents'](contract, ['Transfer'], 0, 10);

      expect(result.length).toEqual(1);

      const block = await result[0].getBlock();
      const transacton = await result[0].getTransaction();
      const rtransaction = await result[0].getTransactionReceipt();
      expect(block).toEqual({ timestamp: 123 });
      expect(transacton).toEqual({ chainId: 1 });
      expect(rtransaction).toEqual({ blockHash: '0x0' });
      expect(fnGetBlock).toHaveBeenCalledTimes(1);
      expect(fnGetBlock).toHaveBeenCalledWith(5);
      expect(fnGetTransaction).toHaveBeenCalledTimes(1);
      expect(fnGetTransaction).toHaveBeenCalledWith('06241fae72a6774cd82d729f77ed78e1');
      expect(fnGetTransactionReceipt).toHaveBeenCalledTimes(1);
      expect(fnGetTransactionReceipt).toHaveBeenCalledWith('06241fae72a6774cd82d729f77ed78e1');
    });
  });
});
