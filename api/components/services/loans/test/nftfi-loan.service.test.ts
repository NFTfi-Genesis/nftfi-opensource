import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ContractRepository, EventArchiveRepositoryToken } from '@nftfi.api/modules/ethers-observer';
import {
  MarketLoanProtocol,
  MarketLoanRepository,
  MarketLoanStatus
} from '@nftfi.api/repositories/postgres/market-loan';
import { NftfiSmartNftIdRepository } from '@nftfi.api/repositories/postgres/nftfi-smart-nft-id';
import { EthersFacade } from '@nftfi.api/modules/ethers-provider';
import { ListingsFacade } from '@nftfi.api/facades/listings';
import { NftfiLoanService } from '../src/subscribers/nftfi/nftfi-loan.service';
import { NftfiLoanCoordinator } from '../src/subscribers/nftfi/nftfi-loan-coordinator';
import { LoanNotificationService } from '../src/loan-notification';
import { NftfiLoanV23RefinanceContract } from '../src/subscribers/nftfi/loan-v2-3-refinance';
import { NftfiLoanV3RefinanceContract } from '../src/subscribers/nftfi/loan-v3-refinance';
import { NftfiLoanV31RefinanceContract } from '../src/subscribers/nftfi/loan-v31-refinance';
import { LoanHelperService } from '../src/subscribers/loan-helper.service';

describe(NftfiLoanService.name, () => {
  let service: NftfiLoanService;
  let loanRepository: MarketLoanRepository;
  let notificationService: LoanNotificationService;
  let loanHelper: LoanHelperService;
  let contractRepository: ContractRepository;
  let ethersFacade: { isWithinBlockRange: jest.Mock };
  let loanCoordinator: { getSmartNftId: jest.Mock };
  let smartNftDataRepository: { create: jest.Mock };
  let eventArchiveRepository: { findByContractEvents: jest.Mock; findByTxHash: jest.Mock };
  const toAsyncIterable = async function* <T>(items: T[]): AsyncGenerator<T> {
    for (const item of items) {
      yield item;
    }
  };

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => void 0);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => void 0);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => void 0);
  });

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        NftfiLoanService,
        {
          provide: ContractRepository,
          useValue: {
            findByType: jest.fn(),
            findByAddress: jest.fn()
          }
        },
        {
          provide: EthersFacade,
          useValue: {
            isWithinBlockRange: jest.fn().mockResolvedValue(true)
          }
        },
        {
          provide: MarketLoanRepository,
          useValue: {
            upsert: jest.fn(),
            updateByKey: jest.fn(),
            updateByIds: jest.fn(),
            findByKey: jest.fn(),
            findOverdue: jest.fn(),
            find: jest.fn(),
            iterateBorrowersByProtocol: jest.fn()
          }
        },
        {
          provide: LoanNotificationService,
          useValue: {
            notifyLoanStarted: jest.fn(),
            notifyLoanRenegotiated: jest.fn(),
            notifyLoanLiquidated: jest.fn(),
            notifyLoanRepaid: jest.fn()
          }
        },
        {
          provide: LoanHelperService,
          useValue: {
            getAmounts: jest.fn().mockResolvedValue({}),
            getAsset: jest.fn(),
            getLoanByKey: jest.fn(),
            invalidateCache: jest.fn().mockResolvedValue(undefined),
            deleteWinningOffer: jest.fn().mockResolvedValue(undefined),
            acceptRenegotiation: jest.fn().mockResolvedValue(undefined)
          }
        },
        {
          provide: NftfiLoanCoordinator,
          useValue: {
            getSmartNftId: jest.fn().mockResolvedValue('12345')
          }
        },
        {
          provide: NftfiSmartNftIdRepository,
          useValue: {
            create: jest.fn().mockResolvedValue(undefined)
          }
        },
        {
          provide: EventArchiveRepositoryToken,
          useValue: {
            findByContractEvents: jest.fn(),
            findByTxHash: jest.fn()
          }
        },
        {
          provide: ListingsFacade,
          useValue: {
            deleteByNftKey: jest.fn().mockResolvedValue(undefined)
          }
        }
      ]
    }).compile();

    service = moduleRef.get(NftfiLoanService);
    loanRepository = moduleRef.get(MarketLoanRepository);
    notificationService = moduleRef.get(LoanNotificationService);
    loanHelper = moduleRef.get(LoanHelperService);
    contractRepository = moduleRef.get(ContractRepository);
    ethersFacade = moduleRef.get(EthersFacade);
    loanCoordinator = moduleRef.get(NftfiLoanCoordinator);
    smartNftDataRepository = moduleRef.get(NftfiSmartNftIdRepository);
    eventArchiveRepository = moduleRef.get(EventArchiveRepositoryToken);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe(NftfiLoanService.prototype.create.name, () => {
    it('creates a loan and notifies', async () => {
      const metadata = { eventId: 'evt-1', tx: '0xtx', blockNumber: 123, contract: '0xContract' };
      const loan = {
        id: 1,
        nftContract: '0xNFT',
        nftTokenId: '10'
      };
      jest.spyOn(loanHelper, 'getAmounts').mockResolvedValue({
        principal: '100',
        repayment: '0',
        repaymentMax: '110',
        interest: '10',
        originationFee: '5',
        adminFee: '0',
        principalUsd: 2,
        principalEth: 1,
        repaymentUsd: 0,
        repaymentEth: 0,
        repaymentMaxUsd: 2,
        repaymentMaxEth: 1,
        interestUsd: 2,
        interestEth: 1,
        originationFeeUsd: 2,
        originationFeeEth: 1,
        adminFeeUsd: 0,
        adminFeeEth: 0
      });
      jest.spyOn(loanHelper, 'getAsset').mockResolvedValue({ id: 123 } as never);
      jest.spyOn(loanRepository, 'upsert').mockResolvedValue(loan as never);

      await service.create(
        {
          loanId: '1',
          lender: '0xLender',
          borrower: '0xBorrower',
          loanStartTime: '1700000000',
          loanDuration: 1000,
          loanPrincipalAmount: '100',
          maximumRepaymentAmount: '110',
          loanERC20Denomination: '0xERC20',
          nftCollateralContract: '0xNFT',
          nftCollateralId: '10',
          loanAdminFeeInBasisPoints: 50,
          isProRata: false,
          originationFee: '5'
        },
        metadata
      );

      expect(loanRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          lender: '0xLender',
          borrower: '0xBorrower',
          loanId: '1',
          protocol: MarketLoanProtocol.Nftfi,
          contract: '0xContract',
          currency: '0xERC20',
          nftContract: '0xNFT',
          nftTokenId: '10',
          asset: { id: 123 },
          status: MarketLoanStatus.Active
        })
      );
      expect(loanHelper.getAsset).toHaveBeenCalledWith('0xNFT', '10', '0xContract#1');
      expect(loanHelper.deleteWinningOffer).toHaveBeenCalledWith({
        lender: '0xLender',
        nftContract: '0xNFT',
        nftTokenId: '10',
        currency: '0xERC20',
        principal: '100',
        repaymentMax: '110',
        duration: 1000
      });
      expect(ethersFacade.isWithinBlockRange).toHaveBeenCalledWith(123, 10000);
      expect(notificationService.notifyLoanStarted).toHaveBeenCalledWith('evt-1', loan);
    });

    it('skips notification when block is out of range', async () => {
      const metadata = { eventId: 'evt-1', tx: '0xtx', blockNumber: 123, contract: '0xContract' };
      jest.spyOn(loanHelper, 'getAsset').mockResolvedValue({ id: 123 } as never);
      jest.spyOn(loanRepository, 'upsert').mockResolvedValue({ id: 1 } as never);
      ethersFacade.isWithinBlockRange.mockResolvedValue(false);

      await service.create(
        {
          loanId: '1',
          lender: '0xLender',
          borrower: '0xBorrower',
          loanStartTime: '1700000000',
          loanDuration: 1000,
          loanPrincipalAmount: '100',
          maximumRepaymentAmount: '110',
          loanERC20Denomination: '0xERC20',
          nftCollateralContract: '0xNFT',
          nftCollateralId: '10',
          loanAdminFeeInBasisPoints: 50,
          isProRata: false,
          originationFee: '5'
        },
        metadata
      );

      expect(loanHelper.invalidateCache).toHaveBeenCalled();
      expect(ethersFacade.isWithinBlockRange).toHaveBeenCalledWith(123, 10000);
      expect(notificationService.notifyLoanStarted).not.toHaveBeenCalled();
    });

    it('persists smartNftId to nftfi_smart_nft_ids', async () => {
      const metadata = { eventId: 'evt-1', tx: '0xtx', blockNumber: 123, contract: '0xContract' };
      const loan = { id: 1, nftContract: '0xNFT', nftTokenId: '10' };
      jest.spyOn(loanHelper, 'getAsset').mockResolvedValue({ id: 123 } as never);
      jest.spyOn(loanRepository, 'upsert').mockResolvedValue(loan as never);
      loanCoordinator.getSmartNftId.mockResolvedValue('99887766');

      await service.create(
        {
          loanId: '1',
          lender: '0xLender',
          borrower: '0xBorrower',
          loanStartTime: '1700000000',
          loanDuration: 1000,
          loanPrincipalAmount: '100',
          maximumRepaymentAmount: '110',
          loanERC20Denomination: '0xERC20',
          nftCollateralContract: '0xNFT',
          nftCollateralId: '10',
          loanAdminFeeInBasisPoints: 50,
          isProRata: false,
          originationFee: '5'
        },
        metadata
      );

      expect(loanCoordinator.getSmartNftId).toHaveBeenCalledWith('0xContract', '1');
      expect(smartNftDataRepository.create).toHaveBeenCalledWith(loan, '99887766');
    });

    it('skips smartNftId persistence when coordinator returns null', async () => {
      const metadata = { eventId: 'evt-1', tx: '0xtx', blockNumber: 123, contract: '0xContract' };
      const loan = { id: 1, nftContract: '0xNFT', nftTokenId: '10' };
      jest.spyOn(loanHelper, 'getAsset').mockResolvedValue({ id: 123 } as never);
      jest.spyOn(loanRepository, 'upsert').mockResolvedValue(loan as never);
      loanCoordinator.getSmartNftId.mockResolvedValue(null);

      await service.create(
        {
          loanId: '1',
          lender: '0xLender',
          borrower: '0xBorrower',
          loanStartTime: '1700000000',
          loanDuration: 1000,
          loanPrincipalAmount: '100',
          maximumRepaymentAmount: '110',
          loanERC20Denomination: '0xERC20',
          nftCollateralContract: '0xNFT',
          nftCollateralId: '10',
          loanAdminFeeInBasisPoints: 50,
          isProRata: false,
          originationFee: '5'
        },
        metadata
      );

      expect(loanCoordinator.getSmartNftId).toHaveBeenCalledWith('0xContract', '1');
      expect(smartNftDataRepository.create).not.toHaveBeenCalled();
    });

    it('throws when coordinator fails to resolve smartNftId', async () => {
      const metadata = { eventId: 'evt-1', tx: '0xtx', blockNumber: 123, contract: '0xContract' };
      jest.spyOn(loanHelper, 'getAsset').mockResolvedValue({ id: 123 } as never);
      jest.spyOn(loanRepository, 'upsert').mockResolvedValue({ id: 1 } as never);
      loanCoordinator.getSmartNftId.mockRejectedValue(new Error('No coordinator mapped'));

      await expect(
        service.create(
          {
            loanId: '1',
            lender: '0xLender',
            borrower: '0xBorrower',
            loanStartTime: '1700000000',
            loanDuration: 1000,
            loanPrincipalAmount: '100',
            maximumRepaymentAmount: '110',
            loanERC20Denomination: '0xERC20',
            nftCollateralContract: '0xNFT',
            nftCollateralId: '10',
            loanAdminFeeInBasisPoints: 50,
            isProRata: false,
            originationFee: '5'
          },
          metadata
        )
      ).rejects.toThrow('No coordinator mapped');

      expect(smartNftDataRepository.create).not.toHaveBeenCalled();
    });

    it('throws when asset is missing', async () => {
      const metadata = { eventId: 'evt-1', tx: '0xtx', blockNumber: 123, contract: '0xContract' };
      jest
        .spyOn(loanHelper, 'getAsset')
        .mockRejectedValue(new Error('Asset not found for loan 0xContract#1: 0xNFT#10'));
      const fnGetAmounts = jest.spyOn(loanHelper, 'getAmounts');
      const fnUpsert = jest.spyOn(loanRepository, 'upsert');
      const fnNotify = jest.spyOn(notificationService, 'notifyLoanStarted');

      await expect(
        service.create(
          {
            loanId: '1',
            lender: '0xLender',
            borrower: '0xBorrower',
            loanStartTime: '1700000000',
            loanDuration: 1000,
            loanPrincipalAmount: '100',
            maximumRepaymentAmount: '110',
            loanERC20Denomination: '0xERC20',
            nftCollateralContract: '0xNFT',
            nftCollateralId: '10',
            loanAdminFeeInBasisPoints: 50,
            isProRata: false,
            originationFee: '5'
          },
          metadata
        )
      ).rejects.toThrow('Asset not found for loan 0xContract#1: 0xNFT#10');

      expect(fnGetAmounts).not.toHaveBeenCalled();
      expect(fnUpsert).not.toHaveBeenCalled();
      expect(fnNotify).not.toHaveBeenCalled();
    });
  });

  describe(NftfiLoanService.prototype.createV3.name, () => {
    it('uses refinanced borrower when refinance event exists', async () => {
      const metadata = { eventId: 'evt-2', tx: '0xtx', blockNumber: 10, contract: '0xContract' };
      const refiContract = { address: '0xRefi' } as NftfiLoanV3RefinanceContract;
      jest.spyOn(contractRepository, 'findByType').mockImplementation(type => {
        if (type === NftfiLoanV23RefinanceContract) {
          return { address: '0xRefi23' } as NftfiLoanV23RefinanceContract;
        }
        if (type === NftfiLoanV3RefinanceContract) return refiContract;
        if (type === NftfiLoanV31RefinanceContract) return { address: '0xRefi31' } as NftfiLoanV31RefinanceContract;
        return null;
      });
      eventArchiveRepository.findByContractEvents.mockResolvedValue([
        { args: { oldLoanContract: '0xOld', oldLoanId: '99', newLoanId: '1' } }
      ]);
      jest.spyOn(loanRepository, 'findByKey').mockResolvedValue({ borrower: '0xBorrower' } as never);
      const fnCreate = jest.spyOn(service, 'create').mockResolvedValue();

      await service.createV3(
        {
          loanId: '1',
          lender: '0xLender',
          borrower: '0xRefi',
          loanStartTime: '1700000000',
          loanDuration: 1000,
          loanPrincipalAmount: '100',
          maximumRepaymentAmount: '110',
          loanERC20Denomination: '0xERC20',
          nftCollateralContract: '0xNFT',
          nftCollateralId: '10',
          loanAdminFeeInBasisPoints: 0,
          isProRata: false,
          originationFee: '0'
        },
        metadata
      );

      expect(eventArchiveRepository.findByContractEvents).toHaveBeenCalledWith(
        '0xrefi23',
        [NftfiLoanV3RefinanceContract.Event.Refinanced],
        10,
        10
      );
      expect(fnCreate).toHaveBeenCalledWith(expect.objectContaining({ borrower: '0xBorrower' }), metadata);
    });

    it('falls back to payload borrower when not a refinance contract', async () => {
      const metadata = { eventId: 'evt-2b', tx: '0xtx', blockNumber: 10, contract: '0xContract' };
      const refiContract = { address: '0xRefi' } as NftfiLoanV3RefinanceContract;
      jest.spyOn(contractRepository, 'findByType').mockImplementation(type => {
        if (type === NftfiLoanV23RefinanceContract) {
          return { address: '0xRefi23' } as NftfiLoanV23RefinanceContract;
        }
        if (type === NftfiLoanV3RefinanceContract) return refiContract;
        if (type === NftfiLoanV31RefinanceContract) return { address: '0xRefi31' } as NftfiLoanV31RefinanceContract;
        return null;
      });
      eventArchiveRepository.findByContractEvents.mockResolvedValue([]);
      const fnCreate = jest.spyOn(service, 'create').mockResolvedValue();

      await service.createV3(
        {
          loanId: '1',
          lender: '0xLender',
          borrower: '0xBorrower',
          loanStartTime: '1700000000',
          loanDuration: 1000,
          loanPrincipalAmount: '100',
          maximumRepaymentAmount: '110',
          loanERC20Denomination: '0xERC20',
          nftCollateralContract: '0xNFT',
          nftCollateralId: '10',
          loanAdminFeeInBasisPoints: 0,
          isProRata: false,
          originationFee: '0'
        },
        metadata
      );

      expect(fnCreate).toHaveBeenCalledWith(expect.objectContaining({ borrower: '0xBorrower' }), metadata);
    });

    it('falls back to payload borrower after exhausting retries', async () => {
      jest.useFakeTimers();
      const fnCreate = jest.spyOn(service, 'create').mockResolvedValue();
      const metadata = { eventId: 'evt-2c', tx: '0xtx', blockNumber: 10, contract: '0xContract' };
      const refiContract = { address: '0xRefi' } as NftfiLoanV3RefinanceContract;
      jest.spyOn(contractRepository, 'findByType').mockImplementation(type => {
        if (type === NftfiLoanV23RefinanceContract) {
          return { address: '0xRefi23' } as NftfiLoanV23RefinanceContract;
        }
        if (type === NftfiLoanV3RefinanceContract) return refiContract;
        if (type === NftfiLoanV31RefinanceContract) return { address: '0xRefi31' } as NftfiLoanV31RefinanceContract;
        return null;
      });
      eventArchiveRepository.findByContractEvents.mockResolvedValue([]);
      const fnFindByKey = jest.spyOn(loanRepository, 'findByKey').mockResolvedValue(null);
      const promise = service.createV3(
        {
          loanId: '1',
          lender: '0xLender',
          borrower: '0xRefi',
          loanStartTime: '1700000000',
          loanDuration: 1000,
          loanPrincipalAmount: '100',
          maximumRepaymentAmount: '110',
          loanERC20Denomination: '0xERC20',
          nftCollateralContract: '0xNFT',
          nftCollateralId: '10',
          loanAdminFeeInBasisPoints: 0,
          isProRata: false,
          originationFee: '0'
        },
        metadata
      );

      await jest.advanceTimersByTimeAsync(10000);
      await promise;

      expect(eventArchiveRepository.findByContractEvents).toHaveBeenCalledTimes(9);
      expect(fnFindByKey).toHaveBeenCalledTimes(0);
      expect(fnCreate).toHaveBeenCalledWith(expect.objectContaining({ borrower: '0xRefi' }), metadata);
    });

    it('retries for refinance borrower until refinance event becomes available', async () => {
      jest.useFakeTimers();

      const metadata = { eventId: 'evt-2d', tx: '0xtx', blockNumber: 10, contract: '0xContract' };
      const refiContract = { address: '0xRefi' } as NftfiLoanV3RefinanceContract;
      jest.spyOn(contractRepository, 'findByType').mockImplementation(type => {
        if (type === NftfiLoanV23RefinanceContract) {
          return { address: '0xRefi23' } as NftfiLoanV23RefinanceContract;
        }
        if (type === NftfiLoanV3RefinanceContract) return refiContract;
        if (type === NftfiLoanV31RefinanceContract) return { address: '0xRefi31' } as NftfiLoanV31RefinanceContract;
        return null;
      });

      eventArchiveRepository.findByContractEvents
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ args: { oldLoanContract: '0xOld', oldLoanId: '99', newLoanId: '1' } }]);

      jest.spyOn(loanRepository, 'findByKey').mockResolvedValue({ borrower: '0xBorrower' } as never);
      const fnCreate = jest.spyOn(service, 'create').mockResolvedValue();

      const createPromise = service.createV3(
        {
          loanId: '1',
          lender: '0xLender',
          borrower: '0xRefi',
          loanStartTime: '1700000000',
          loanDuration: 1000,
          loanPrincipalAmount: '100',
          maximumRepaymentAmount: '110',
          loanERC20Denomination: '0xERC20',
          nftCollateralContract: '0xNFT',
          nftCollateralId: '10',
          loanAdminFeeInBasisPoints: 0,
          isProRata: false,
          originationFee: '0'
        },
        metadata
      );

      await jest.advanceTimersByTimeAsync(5000);
      await createPromise;

      expect(eventArchiveRepository.findByContractEvents).toHaveBeenCalledTimes(4);
      expect(fnCreate).toHaveBeenCalledWith(expect.objectContaining({ borrower: '0xBorrower' }), metadata);
    });
  });

  describe(NftfiLoanService.prototype.renegotiate.name, () => {
    it('updates loan amounts and notifies', async () => {
      const loan = {
        principal: '100',
        currency: '0xERC20',
        originationFee: '5',
        startedAt: new Date('2024-01-01T00:00:00.000Z')
      };
      jest.spyOn(loanHelper, 'getLoanByKey').mockResolvedValue(loan as never);
      jest.spyOn(loanRepository, 'updateByKey').mockResolvedValue({ id: 1 } as never);
      jest.spyOn(loanHelper, 'getAmounts').mockResolvedValue({
        repayment: '0',
        repaymentMax: '120',
        interest: '20',
        repaymentUsd: 10,
        repaymentEth: 5,
        repaymentMaxUsd: 10,
        repaymentMaxEth: 5
      } as never);

      await service.renegotiate(
        { loanId: '1', newMaximumRepaymentAmount: '120', newLoanDuration: 1000, isProRata: true },
        {
          eventId: 'evt-3',
          contract: '0xContract',
          emittedAt: new Date('2024-01-02T00:00:00.000Z'),
          blockNumber: 200
        }
      );

      expect(loanRepository.updateByKey).toHaveBeenCalledWith(
        '0xContract',
        '1',
        expect.objectContaining({
          status: MarketLoanStatus.Active,
          repayment: '0',
          repaymentMax: '120',
          interest: '20',
          repaymentUsd: 10,
          repaymentEth: 5,
          repaymentMaxUsd: 10,
          repaymentMaxEth: 5
        })
      );
      expect(ethersFacade.isWithinBlockRange).toHaveBeenCalledWith(200, 10000);
      expect(notificationService.notifyLoanRenegotiated).toHaveBeenCalledWith('evt-3', { id: 1 });
    });

    it('skips notification when block is out of range', async () => {
      const loan = {
        principal: '100',
        currency: '0xERC20',
        originationFee: '5',
        startedAt: new Date('2024-01-01T00:00:00.000Z')
      };
      jest.spyOn(loanHelper, 'getLoanByKey').mockResolvedValue(loan as never);
      jest.spyOn(loanRepository, 'updateByKey').mockResolvedValue({ id: 1 } as never);
      jest.spyOn(loanHelper, 'getAmounts').mockResolvedValue({} as never);
      ethersFacade.isWithinBlockRange.mockResolvedValue(false);

      await service.renegotiate(
        { loanId: '1', newMaximumRepaymentAmount: '120', newLoanDuration: 1000, isProRata: true },
        {
          eventId: 'evt-3',
          contract: '0xContract',
          emittedAt: new Date('2024-01-02T00:00:00.000Z'),
          blockNumber: 200
        }
      );

      expect(ethersFacade.isWithinBlockRange).toHaveBeenCalledWith(200, 10000);
      expect(notificationService.notifyLoanRenegotiated).not.toHaveBeenCalled();
    });
  });

  describe(NftfiLoanService.prototype.liquidate.name, () => {
    it('updates status and notifies', async () => {
      jest.spyOn(loanRepository, 'updateByKey').mockResolvedValue({ id: 2 } as never);

      await service.liquidate(
        { loanId: '2' },
        {
          eventId: 'evt-4',
          contract: '0xContract',
          emittedAt: new Date('2024-01-03T00:00:00.000Z'),
          tx: '0xTx',
          blockNumber: 300
        }
      );

      expect(loanRepository.updateByKey).toHaveBeenCalledWith('0xContract', '2', {
        status: MarketLoanStatus.Liquidated,
        endedAt: new Date('2024-01-03T00:00:00.000Z'),
        endedTx: '0xTx'
      });
      expect(ethersFacade.isWithinBlockRange).toHaveBeenCalledWith(300, 10000);
      expect(notificationService.notifyLoanLiquidated).toHaveBeenCalledWith('evt-4', { id: 2 });
    });

    it('skips notification when block is out of range', async () => {
      jest.spyOn(loanRepository, 'updateByKey').mockResolvedValue({ id: 2 } as never);
      ethersFacade.isWithinBlockRange.mockResolvedValue(false);

      await service.liquidate(
        { loanId: '2' },
        {
          eventId: 'evt-4',
          contract: '0xContract',
          emittedAt: new Date('2024-01-03T00:00:00.000Z'),
          tx: '0xTx',
          blockNumber: 300
        }
      );

      expect(ethersFacade.isWithinBlockRange).toHaveBeenCalledWith(300, 10000);
      expect(notificationService.notifyLoanLiquidated).not.toHaveBeenCalled();
    });
  });

  describe(NftfiLoanService.prototype.repay.name, () => {
    it('updates repayment and notifies', async () => {
      const loan = {
        principal: '100',
        duration: 1000,
        currency: '0xERC20',
        originationFee: '5'
      };
      jest.spyOn(loanHelper, 'getLoanByKey').mockResolvedValue(loan as never);
      jest.spyOn(loanRepository, 'updateByKey').mockResolvedValue({ id: 3 } as never);
      jest.spyOn(loanHelper, 'getAmounts').mockResolvedValue({
        repayment: '130',
        interest: '30',
        adminFee: '10'
      } as never);

      await service.repay(
        {
          loanId: '3',
          borrower: '0xBorrower',
          loanPrincipalAmount: '100',
          amountPaidToLender: '130',
          adminFee: '10'
        },
        {
          eventId: 'evt-5',
          tx: '0xTx',
          blockNumber: 100,
          contract: '0xContract',
          emittedAt: new Date('2024-01-04T00:00:00.000Z')
        }
      );

      expect(loanRepository.updateByKey).toHaveBeenCalledWith(
        '0xContract',
        '3',
        expect.objectContaining({
          status: MarketLoanStatus.Repaid,
          endedAt: new Date('2024-01-04T00:00:00.000Z'),
          endedTx: '0xTx',
          repayment: '130',
          adminFee: '10',
          interest: '30'
        })
      );
      expect(ethersFacade.isWithinBlockRange).toHaveBeenCalledWith(100, 10000);
      expect(notificationService.notifyLoanRepaid).toHaveBeenCalledWith('evt-5', { id: 3 });
    });

    it('skips notification when block is out of range', async () => {
      const loan = {
        principal: '100',
        duration: 1000,
        currency: '0xERC20',
        originationFee: '5'
      };
      jest.spyOn(loanHelper, 'getLoanByKey').mockResolvedValue(loan as never);
      jest.spyOn(loanRepository, 'updateByKey').mockResolvedValue({ id: 3 } as never);
      jest.spyOn(loanHelper, 'getAmounts').mockResolvedValue({} as never);
      ethersFacade.isWithinBlockRange.mockResolvedValue(false);

      await service.repay(
        {
          loanId: '3',
          borrower: '0xBorrower',
          loanPrincipalAmount: '100',
          amountPaidToLender: '130',
          adminFee: '10'
        },
        {
          eventId: 'evt-5',
          tx: '0xTx',
          blockNumber: 100,
          contract: '0xContract',
          emittedAt: new Date('2024-01-04T00:00:00.000Z')
        }
      );

      expect(ethersFacade.isWithinBlockRange).toHaveBeenCalledWith(100, 10000);
      expect(notificationService.notifyLoanRepaid).not.toHaveBeenCalled();
    });
  });

  describe(NftfiLoanService.prototype.updateLoansWithRefiBorrower.name, () => {
    it('updates borrower from refinance tx and exits', async () => {
      const refiContract = { address: '0xRefi' } as NftfiLoanV3RefinanceContract;
      jest.spyOn(contractRepository, 'findByType').mockImplementation(type => {
        if (type === NftfiLoanV23RefinanceContract) {
          return { address: '0xRefi23' } as NftfiLoanV23RefinanceContract;
        }
        if (type === NftfiLoanV3RefinanceContract) return refiContract;
        if (type === NftfiLoanV31RefinanceContract) return { address: '0xRefi31' } as NftfiLoanV31RefinanceContract;
        return null;
      });
      jest
        .spyOn(loanRepository, 'iterateBorrowersByProtocol')
        .mockReturnValue(
          toAsyncIterable([{ contract: '0xLoan', loanId: '10', borrower: '0xrefi', startedTx: '0xTx' }] as never)
        );
      eventArchiveRepository.findByTxHash.mockResolvedValue([
        { args: { oldLoanContract: '0xOld', oldLoanId: '5', newLoanId: '10' } }
      ]);
      jest.spyOn(loanRepository, 'findByKey').mockResolvedValue({ borrower: '0xBorrower' } as never);
      const fnUpdate = jest.spyOn(loanRepository, 'updateByKey').mockResolvedValue({} as never);

      await service.updateLoansWithRefiBorrower();

      expect(fnUpdate).toHaveBeenCalledWith('0xLoan', '10', { borrower: '0xBorrower' });
    });

    it('skips update when no refinance events are found', async () => {
      const refiContract = { address: '0xRefi' } as NftfiLoanV3RefinanceContract;
      jest.spyOn(contractRepository, 'findByType').mockImplementation(type => {
        if (type === NftfiLoanV23RefinanceContract) {
          return { address: '0xRefi23' } as NftfiLoanV23RefinanceContract;
        }
        if (type === NftfiLoanV3RefinanceContract) return refiContract;
        if (type === NftfiLoanV31RefinanceContract) return { address: '0xRefi31' } as NftfiLoanV31RefinanceContract;
        return null;
      });
      jest
        .spyOn(loanRepository, 'iterateBorrowersByProtocol')
        .mockReturnValue(
          toAsyncIterable([{ contract: '0xLoan', loanId: '10', borrower: '0xrefi', startedTx: '0xTx' }] as never)
        );
      eventArchiveRepository.findByTxHash.mockResolvedValue([]);

      await service.updateLoansWithRefiBorrower();

      expect(loanRepository.updateByKey).not.toHaveBeenCalled();
    });

    it('skips update when refinance loan is not found', async () => {
      const warnSpy = Logger.prototype.warn as jest.Mock;
      const refiContract = { address: '0xRefi' } as NftfiLoanV3RefinanceContract;
      jest.spyOn(contractRepository, 'findByType').mockImplementation(type => {
        if (type === NftfiLoanV23RefinanceContract) {
          return { address: '0xRefi23' } as NftfiLoanV23RefinanceContract;
        }
        if (type === NftfiLoanV3RefinanceContract) return refiContract;
        if (type === NftfiLoanV31RefinanceContract) return { address: '0xRefi31' } as NftfiLoanV31RefinanceContract;
        return null;
      });
      jest
        .spyOn(loanRepository, 'iterateBorrowersByProtocol')
        .mockReturnValue(
          toAsyncIterable([{ contract: '0xLoan', loanId: '10', borrower: '0xrefi', startedTx: '0xTx' }] as never)
        );
      eventArchiveRepository.findByTxHash.mockResolvedValue([
        { args: { oldLoanContract: '0xOld', oldLoanId: '5', newLoanId: '10' } }
      ]);
      jest.spyOn(loanRepository, 'findByKey').mockResolvedValue(null);

      await service.updateLoansWithRefiBorrower();

      expect(loanRepository.updateByKey).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        'Could not find refinance event for 1 loans with borrower as refinance contract. Loans: contract=0xLoan loanId=10'
      );
    });

    it('logs one aggregated warning when multiple loans cannot resolve refinance borrower', async () => {
      const warnSpy = Logger.prototype.warn as jest.Mock;
      const refiContract = { address: '0xRefi' } as NftfiLoanV3RefinanceContract;
      jest.spyOn(contractRepository, 'findByType').mockImplementation(type => {
        if (type === NftfiLoanV23RefinanceContract) {
          return { address: '0xRefi23' } as NftfiLoanV23RefinanceContract;
        }
        if (type === NftfiLoanV3RefinanceContract) return refiContract;
        if (type === NftfiLoanV31RefinanceContract) return { address: '0xRefi31' } as NftfiLoanV31RefinanceContract;
        return null;
      });
      jest.spyOn(loanRepository, 'iterateBorrowersByProtocol').mockReturnValue(
        toAsyncIterable([
          { contract: '0xLoanA', loanId: '10', borrower: '0xrefi', startedTx: '0xTxA' },
          { contract: '0xLoanB', loanId: '11', borrower: '0xrefi', startedTx: '0xTxB' }
        ] as never)
      );
      eventArchiveRepository.findByTxHash.mockImplementation((tx: string) => {
        if (tx === '0xTxA') {
          return Promise.resolve([{ args: { oldLoanContract: '0xOld', oldLoanId: '5', newLoanId: '10' } }]);
        }
        return Promise.resolve([{ args: { oldLoanContract: '0xOld', oldLoanId: '5', newLoanId: '999' } }]);
      });
      jest.spyOn(loanRepository, 'findByKey').mockResolvedValue(null);

      await service.updateLoansWithRefiBorrower();

      expect(loanRepository.updateByKey).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        'Could not find refinance event for 2 loans with borrower as refinance contract. Loans: contract=0xLoanA loanId=10; contract=0xLoanB loanId=11'
      );
    });
  });

  describe('private helpers', () => {
    it('getRefinanceContractAddresses caches addresses', () => {
      const refiContract = { address: '0xRefi' } as NftfiLoanV3RefinanceContract;
      jest.spyOn(contractRepository, 'findByType').mockImplementation(type => {
        if (type === NftfiLoanV23RefinanceContract) {
          return { address: '0xRefi23' } as NftfiLoanV23RefinanceContract;
        }
        if (type === NftfiLoanV3RefinanceContract) return refiContract;
        if (type === NftfiLoanV31RefinanceContract) return { address: '0xRefi31' } as NftfiLoanV31RefinanceContract;
        return null;
      });
      const svc = service as unknown as { getRefinanceContractAddresses: Function };

      expect(svc.getRefinanceContractAddresses()).toStrictEqual(['0xrefi23', '0xrefi', '0xrefi31']);
      expect(svc.getRefinanceContractAddresses()).toStrictEqual(['0xrefi23', '0xrefi', '0xrefi31']);
      expect(contractRepository.findByType).toHaveBeenCalledTimes(3);
    });

    it('getRefinanceContractAddresses throws when a contract is missing', () => {
      jest.spyOn(contractRepository, 'findByType').mockImplementation(type => {
        if (type === NftfiLoanV3RefinanceContract) return { address: '0xRefi' } as NftfiLoanV3RefinanceContract;
        if (type === NftfiLoanV31RefinanceContract) return null;
        return null;
      });

      expect(() =>
        (service as unknown as { getRefinanceContractAddresses: Function }).getRefinanceContractAddresses()
      ).toThrow(
        'Contract not found for type NftfiLoanV23RefinanceContract, cannot determine refinance contract address'
      );
    });

    it('getRefinancedLoan returns null when borrower is not a refi contract', async () => {
      jest.spyOn(contractRepository, 'findByType').mockImplementation(type => {
        if (type === NftfiLoanV23RefinanceContract) return { address: '0xRefi23' } as NftfiLoanV23RefinanceContract;
        if (type === NftfiLoanV3RefinanceContract) return { address: '0xRefi' } as NftfiLoanV3RefinanceContract;
        if (type === NftfiLoanV31RefinanceContract) return { address: '0xRefi31' } as NftfiLoanV31RefinanceContract;
        return null;
      });

      const result = await (service as unknown as { getRefinancedLoan: Function }).getRefinancedLoan(
        { borrower: '0xNotARefi', loanId: '1' },
        []
      );

      expect(result).toBeNull();
    });
  });
});
