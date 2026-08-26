import { DiscoveryService } from '@nestjs/core';
import { Logger, Type } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ParamType, Result } from '@ethersproject/abi';
import { EventHandler } from '@nftfi.api/modules/ethers-observer';
import { Block, Log, LogArgs } from '@nftfi.api/modules/ethers-observer/decorators';
import {
  EventArchiveRepository,
  EventArchiveRepositoryToken
} from '@nftfi.api/modules/ethers-observer/event-archive.types';
import { ContractRepository } from '../../src/ethers-observer/contract.repository';
import { ContractExplorerService } from '../../src/ethers-observer/contract-explorer.service';
import { buildBlock, buildContract, buildContractSubscriber, buildContractType, buildEventLog } from './factories';

jest.mock('@ethersproject/contracts', () => ({
  Contract: class {}
}));

describe(ContractExplorerService.name, () => {
  let service: ContractExplorerService;
  let eventArchiveRepository: EventArchiveRepository;

  const buildModuleRef = async (providers: Type[]): Promise<void> => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            (): object => ({
              ethereum: {
                contracts: {
                  contract1: {
                    address: '0x123',
                    replayBlock: 0
                  }
                }
              }
            })
          ]
        })
      ],
      providers: [
        DiscoveryService,
        ContractExplorerService,
        {
          provide: ContractRepository,
          useValue: {
            findOrCreate: jest.fn().mockReturnValue(v => v),
            getContractMetadata: jest.fn().mockReturnValue({
              replay: {
                startAt: 0,
                enabled: false
              }
            })
          }
        },
        {
          provide: EventArchiveRepositoryToken,
          useValue: { upsert: jest.fn() }
        },
        ...(providers || [])
      ]
    }).compile();

    service = moduleRef.get(ContractExplorerService);
    eventArchiveRepository = moduleRef.get(EventArchiveRepositoryToken);
  };

  beforeEach(() => {
    jest.resetAllMocks();

    jest.spyOn(Logger.prototype, 'log').mockImplementation(jest.fn());
    jest.spyOn(Logger.prototype, 'error').mockImplementation(jest.fn());
  });

  it('scans app for contract handlers', async () => {
    class Subscriber1 {
      @EventHandler('Event')
      onEvent(): void {
        void 0;
      }
    }
    const contract = buildContractType({ address: '0x123' });
    const subscriber1 = buildContractSubscriber({ contract, subscriberClass: Subscriber1 });
    await buildModuleRef([subscriber1]);

    await expect(service.onModuleInit()).resolves.toBeUndefined();
    expect(service.getRegisteredHandlers()).toEqual([
      {
        key: 'undefined_Event',
        contract: expect.any(Function),
        handler: expect.any(Function),
        eventName: 'Event',
        params: undefined
      }
    ]);
  });

  it('does not scan for contract handlers if no subscribers are found', async () => {
    await buildModuleRef([]);
    await expect(service.onModuleInit()).resolves.toBeUndefined();
    expect(service.getRegisteredHandlers()).toEqual([]);
  });

  it('parses subscriber parameter decorators', async () => {
    class Subscriber1 {
      @EventHandler('Event1')
      onEvent(@Block() block: object, @Log() log: object, @LogArgs() logArgs: object): void {
        block;
        log;
        logArgs;
      }
    }
    class Subscriber2 {
      @EventHandler('Event2')
      onEvent(): void {
        void 0;
      }
    }
    const contract1 = buildContractType({ address: '0x123' });
    const subscriber1 = buildContractSubscriber({ contract: contract1, subscriberClass: Subscriber1 });
    const contract2 = buildContractType({ address: '0x456', replay: { startAt: 18902844754, enabled: true } });
    const subscriber2 = buildContractSubscriber({ contract: contract2, subscriberClass: Subscriber2 });
    await buildModuleRef([subscriber1, subscriber2]);

    await expect(service.onModuleInit()).resolves.toBeUndefined();
    expect(service.getRegisteredHandlerGroups()).toEqual([
      [
        {
          key: 'undefined_Event1',
          contract: expect.any(Function),
          eventName: 'Event1',
          handler: expect.any(Function),
          params: {
            '@nftfi.api:ethers-contract:event-listener:params:args:2': {
              data: undefined,
              index: 2
            },
            '@nftfi.api:ethers-contract:event-listener:params:block:0': {
              data: undefined,
              index: 0
            },
            '@nftfi.api:ethers-contract:event-listener:params:log:1': {
              data: undefined,
              index: 1
            }
          }
        }
      ],
      [
        {
          key: 'undefined_Event2',
          contract: expect.any(Function),
          eventName: 'Event2',
          handler: expect.any(Function),
          params: undefined
        }
      ]
    ]);
  });

  it('does not register handler if it is missing metadata', async () => {
    class Subscriber {
      @EventHandler('Event')
      onEvent(): void {
        void 0;
      }
    }

    const subscriber = buildContractSubscriber({ subscriberClass: Subscriber });
    await buildModuleRef([subscriber]);

    service.onModuleInit();

    expect(service.getRegisteredHandlers()).toEqual([]);
  });

  describe('callHandler', () => {
    beforeEach(async () => {
      const contract = buildContractType();
      const subscriber = buildContractSubscriber({ contract });
      await buildModuleRef([subscriber]);
    });

    it('calls handler with basic parameters', async () => {
      const fnHandler = jest.fn();
      const contract = buildContract({
        interface: {
          getEvent: jest.fn().mockReturnValue({
            anonymous: false,
            inputs: [
              {
                name: 'borrower',
                type: 'address'
              },
              {
                name: 'lender',
                type: 'address'
              },
              {
                name: 'loanId',
                type: 'uint256'
              }
            ],
            name: 'Transfer',
            type: 'event'
          })
        }
      });
      const eventLog = buildEventLog({
        args: {
          borrower: '0x123',
          lender: '0x456',
          loanId: '123'
        } as unknown as Result
      });
      const promise = service.callHandler(fnHandler, undefined, contract, eventLog);

      await expect(promise).resolves.toBe(true);
      expect(fnHandler).toHaveBeenCalledWith(
        {
          borrower: '0x123',
          lender: '0x456',
          loanId: '123'
        },
        eventLog
      );
    });

    it('calls handler with decorated parameters', async () => {
      const fnHandler = jest.fn();
      const contract = buildContract({
        interface: {
          getEvent: jest.fn().mockReturnValue({
            anonymous: false,
            inputs: [
              {
                name: 'borrower',
                type: 'address'
              },
              {
                name: 'lender',
                type: 'address'
              },
              {
                name: 'loanId',
                type: 'uint256'
              }
            ],
            name: 'Transfer',
            type: 'event'
          })
        }
      });
      const block = buildBlock();
      const eventLog = buildEventLog({
        event: 'Transfer',
        args: { borrower: '0x123', lender: '0x456', loanId: '123' } as unknown as Result,
        getBlock: jest.fn().mockReturnValue(block)
      });
      await service.callHandler(
        fnHandler,
        {
          '@nftfi.api:ethers-contract:event-listener:params:args:3': {
            data: undefined,
            index: 3
          },
          '@nftfi.api:ethers-contract:event-listener:params:block:1': {
            data: undefined,
            index: 1
          },
          '@nftfi.api:ethers-contract:event-listener:params:block:0': {
            data: 'timestamp',
            index: 0
          },
          '@nftfi.api:ethers-contract:event-listener:params:log:2': {
            data: undefined,
            index: 2
          },
          '@nftfi.api:ethers-contract:event-listener:params:internal-id:4': {
            data: undefined,
            index: 4
          },
          '@nftfi.api:ethers-contract:event-listener:params:emitted-at:5': {
            data: undefined,
            index: 5
          },
          '@nftfi.api:ethers-contract:event-listener:params:contract:6': {
            data: undefined,
            index: 6
          }
        },
        contract,
        eventLog
      );

      expect(fnHandler).toHaveBeenCalledWith(
        1713279324,
        block,
        eventLog,
        { borrower: '0x123', lender: '0x456', loanId: '123' },
        '0x0-Transfer-0x974c336c349bf9e3ef4bcdc73aa50b73f6bac9f2d9955a9e08856e41024290a8',
        new Date(block.timestamp * 1000),
        contract
      );
    });

    it('extracts event data from log', async () => {
      const fnHandler = jest.fn();
      const block = buildBlock();
      const contract = buildContract({
        transactionHash: '0x974c336c349bf9e3ef4bcdc73aa50b73f6bac9f2d9955a9e08856e41024290a8',
        interface: {
          getEvent: jest.fn().mockReturnValue({
            anonymous: false,
            inputs: [],
            name: 'Transfer',
            type: 'event'
          })
        }
      });
      const eventLog = buildEventLog({ getBlock: jest.fn().mockReturnValue(block) });
      await service.callHandler(
        fnHandler,
        {
          '@nftfi.api:ethers-contract:event-listener:params:log:0': {
            data: 'transactionHash',
            index: 0
          },
          '@nftfi.api:ethers-contract:event-listener:params:txhash:1': {
            data: undefined,
            index: 1
          }
        },
        contract,
        eventLog
      );

      expect(fnHandler).toHaveBeenCalledWith(
        '0x974c336c349bf9e3ef4bcdc73aa50b73f6bac9f2d9955a9e08856e41024290a8',
        '0x974c336c349bf9e3ef4bcdc73aa50b73f6bac9f2d9955a9e08856e41024290a8'
      );
    });

    it('parses nested fragment data', async () => {
      const contract = buildContract({
        interface: {
          getEvent: jest.fn().mockReturnValue({
            anonymous: false,
            inputs: [
              { indexed: true, name: 'loanId', type: 'uint32' },
              { indexed: true, name: 'borrower', type: 'address' },
              { indexed: true, name: 'lender', type: 'address' },
              {
                components: [
                  { name: 'revenueSharePartner', type: 'address' },
                  { name: 'revenueShareInBasisPoints', type: 'uint256' },
                  { name: 'referralFeeInBasisPoints', type: 'uint256' }
                ],
                indexed: false,
                name: 'loanExtras',
                type: 'tuple'
              }
            ] as ParamType[],
            name: 'Event',
            type: 'event'
          })
        }
      });
      const eventLog = buildEventLog({
        args: {
          borrower: '0x123',
          lender: '0x456',
          loanId: '123',
          loanExtras: {
            revenueSharePartner: '0x789',
            revenueShareInBasisPoints: '16',
            referralFeeInBasisPoints: '9'
          }
        } as unknown as Result
      });
      const fnHandler = jest.fn();
      await service.callHandler(fnHandler, undefined, contract, eventLog);

      expect(fnHandler).toHaveBeenCalledWith(
        {
          borrower: '0x123',
          lender: '0x456',
          loanId: '123',
          loanExtras: {
            revenueSharePartner: '0x789',
            revenueShareInBasisPoints: '16',
            referralFeeInBasisPoints: '9'
          }
        },
        eventLog
      );
    });

    it('adds a database record of a log to event-archive repository', async () => {
      const contract = buildContract({
        interface: {
          getEvent: jest.fn().mockReturnValue({
            anonymous: false,
            inputs: [
              {
                name: 'borrower',
                type: 'address'
              },
              {
                name: 'lender',
                type: 'address'
              },
              {
                name: 'loanId',
                type: 'uint256'
              }
            ],
            name: 'TestEvent',
            type: 'event'
          })
        }
      });
      const block = buildBlock({ timestamp: 1713279324, number: 0 });
      const eventLog = buildEventLog({
        args: {
          borrower: '0x123',
          lender: '0x456',
          loanId: '123'
        } as unknown as Result,
        event: 'TestEvent',
        logIndex: 0,
        getBlock: jest.fn().mockReturnValue(block)
      });
      const fnUpsertEventArchive = jest.spyOn(eventArchiveRepository, 'upsert').mockImplementation(jest.fn());

      await service.callHandler(jest.fn(), undefined, contract, eventLog);

      expect(fnUpsertEventArchive).toHaveBeenCalledWith({
        args: {
          borrower: '0x123',
          lender: '0x456',
          loanId: '123'
        },
        blockNumber: 0,
        emittedAt: new Date('2024-04-16T14:55:24.000Z'),
        contract: '0x0',
        index: 0,
        txHash: '0x974c336c349bf9e3ef4bcdc73aa50b73f6bac9f2d9955a9e08856e41024290a8',
        name: 'TestEvent',
        played: true
      });
    });

    it('ignores thrown error by handler', async () => {
      const eventLog = buildEventLog({});
      const contract = buildContract({
        interface: {
          getEvent: jest.fn().mockReturnValue({
            anonymous: false,
            inputs: [],
            name: 'TestEvent',
            type: 'event'
          })
        }
      });
      const fnHandler = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      await expect(() => service.callHandler(fnHandler, undefined, contract, eventLog)).not.toThrow();
    });

    it('stops execution if event fragment not found', async () => {
      const fnUpsertEventArchive = jest.spyOn(eventArchiveRepository, 'upsert').mockImplementation(jest.fn());
      const eventLog = buildEventLog({});
      const contract = buildContract({
        interface: {
          getEvent: jest.fn().mockReturnValue(null)
        }
      });
      const fnHandler = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      await expect(() => service.callHandler(fnHandler, undefined, contract, eventLog)).not.toThrow();
      expect(fnUpsertEventArchive).toHaveBeenCalledWith({
        args: ['123', '0x123', '0x456'],
        blockNumber: undefined,
        contract: '0x0',
        emittedAt: new Date('2024-04-16T14:55:24.000Z'),
        index: undefined,
        name: undefined,
        played: false,
        txHash: '0x974c336c349bf9e3ef4bcdc73aa50b73f6bac9f2d9955a9e08856e41024290a8'
      });
    });
  });
});
