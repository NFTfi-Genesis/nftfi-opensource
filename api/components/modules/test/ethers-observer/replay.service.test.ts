import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { HealthModule } from '@nftfi.api/modules/health';
import { EthersFacade } from '@nftfi.api/modules/ethers-provider';
import { ContractRepository, ContractExplorerService, ConfigToken } from '@nftfi.api/modules/ethers-observer';
import { ReplayService } from '../../src/ethers-observer/replay-strategies/replay.service';
import { buildContract, buildEventLog, buildRegisteredHandler } from './factories';

jest.mock('@ethersproject/contracts', () => ({
  Contract: class {}
}));

describe(ReplayService.name, () => {
  let service: ReplayService;
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
                  chunkSize: 5
                }
              }
            })
          ]
        }),
        HealthModule
      ],
      providers: [
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
              chunkSize: 5
            }
          }
        }
      ]
    }).compile();

    contractExplorerService = moduleRef.get(ContractExplorerService);
    contractRepository = moduleRef.get(ContractRepository);
    ethersFacade = moduleRef.get(EthersFacade);
    const config = moduleRef.get(ConfigToken);

    service = new ReplayService(contractExplorerService, ethersFacade, contractRepository, config);
  });

  describe(ReplayService.prototype['getContractStartBlock'].name, () => {
    it('throws error when method is not overridden', async () => {
      const contract = buildContract();
      await expect(service['getContractStartBlock'](contract)).rejects.toThrow('Method not implemented!');
    });
  });

  describe(ReplayService.prototype['getContractEndBlock'].name, () => {
    it('throws error when method is not overridden', async () => {
      const contract = buildContract();
      await expect(service['getContractEndBlock'](contract)).rejects.toThrow('Method not implemented!');
    });
  });

  describe(ReplayService.prototype['findEvents'].name, () => {
    it('throws error when method is not overridden', async () => {
      const contract = buildContract();
      await expect(service['findEvents'](contract, ['Test'], 10, 20)).rejects.toThrow('Method not implemented!');
    });
  });

  describe(ReplayService.prototype['getNextBlockRangeChunk'].name, () => {
    it('returns group max block if they are not aligned', () => {
      const result = service['getNextBlockRangeChunk']({ start: 10, end: 20 });

      expect(result).toEqual({ start: 10, end: 15 });
    });
  });

  describe(ReplayService.prototype['getGroupContract'].name, () => {
    it('throws when handler group is empty', () => {
      expect(() => service['getGroupContract']([])).toThrow('Cannot get contract from empty handler group');
    });
  });

  describe(ReplayService.prototype['replayGroupEvents'].name, () => {
    it('returns early when handler group is empty', async () => {
      const fnGetBlockRanges = jest.spyOn(service as never, 'getBlockRangesForContracts' as never);

      await service['replayGroupEvents']([]);

      expect(fnGetBlockRanges).not.toHaveBeenCalled();
    });

    it('throws when handler returns false', async () => {
      const contract = buildContract({ address: '0x1234' });
      const handler = buildRegisteredHandler({ contract, eventName: 'Transfer' });
      const events = [buildEventLog({ event: 'Transfer', address: contract.address, blockNumber: 123 })];

      jest
        .spyOn(service as never, 'getBlockRangesForContracts')
        .mockResolvedValue({ [contract.address]: { start: 0, end: 10 } } as never);
      jest.spyOn(service as never, 'findEvents' as never).mockResolvedValue(events as never);
      jest.spyOn(contractExplorerService, 'callHandler').mockResolvedValue(false);

      await expect(service['replayGroupEvents']([handler])).rejects.toThrow(
        `Failed to play event Transfer @ ${contract.address} in block 123. Aborting replay.`
      );

      expect(contractRepository.updateReplayBlock).not.toHaveBeenCalled();
    });
  });
});
