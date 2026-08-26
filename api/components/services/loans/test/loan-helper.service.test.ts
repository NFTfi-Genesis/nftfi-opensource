import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ContractRepository } from '@nftfi.api/modules/ethers-observer';
import { SupportedCurrencies } from '@nftfi.api/core';
import { AssetsFacade } from '@nftfi.api/facades/assets';
import { LoansFacade } from '@nftfi.api/facades/loans';
import { OffersFacade } from '@nftfi.api/facades/offers';
import { FxRatesFacade } from '@nftfi.api/facades/fx-rates';
import {
  MarketLoanProtocol,
  MarketLoanRepository,
  MarketLoanStatus
} from '@nftfi.api/repositories/postgres/market-loan';
import { buildPostgresMarketLoan } from '@nftfi.api/repositories/postgres/factories/market-loan';
import { buildAssetDto } from '@nftfi.api/services/assets/factories';
import { LoanHelperService } from '../src/subscribers/loan-helper.service';

describe(LoanHelperService.name, () => {
  let service: LoanHelperService;
  let loanRepository: jest.Mocked<Pick<MarketLoanRepository, 'findOverdue' | 'updateByIds' | 'findByKey'>>;
  let contractRepository: jest.Mocked<Pick<ContractRepository, 'findByAddress'>>;
  let supportedCurrencies: jest.Mocked<Pick<SupportedCurrencies, 'calculateUsdAmount' | 'calculateEthAmount'>>;
  let fxRates: jest.Mocked<Pick<FxRatesFacade, 'getRateAtDate'>>;
  let assetsFacade: jest.Mocked<Pick<AssetsFacade, 'getAssetByKey'>>;
  let loansFacade: jest.Mocked<Pick<LoansFacade, 'invalidateCache'>>;
  let offersFacade: jest.Mocked<Pick<OffersFacade, 'deleteWinningOffer'>>;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => void 0);
  });

  beforeEach(async () => {
    jest.resetAllMocks();

    loanRepository = {
      findOverdue: jest.fn(),
      updateByIds: jest.fn(),
      findByKey: jest.fn()
    };
    contractRepository = {
      findByAddress: jest.fn()
    };
    supportedCurrencies = {
      calculateUsdAmount: jest.fn(),
      calculateEthAmount: jest.fn()
    };
    fxRates = {
      getRateAtDate: jest.fn()
    };
    assetsFacade = {
      getAssetByKey: jest.fn()
    };
    loansFacade = {
      invalidateCache: jest.fn().mockResolvedValue(undefined)
    };
    offersFacade = {
      deleteWinningOffer: jest.fn().mockResolvedValue(undefined)
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        LoanHelperService,
        { provide: MarketLoanRepository, useValue: loanRepository },
        { provide: ContractRepository, useValue: contractRepository },
        { provide: SupportedCurrencies, useValue: supportedCurrencies },
        { provide: FxRatesFacade, useValue: fxRates },
        { provide: AssetsFacade, useValue: assetsFacade },
        { provide: LoansFacade, useValue: loansFacade },
        { provide: OffersFacade, useValue: offersFacade }
      ]
    }).compile();

    service = moduleRef.get(LoanHelperService);
  });

  describe(LoanHelperService.prototype.invalidateCache.name, () => {
    it('delegates to loansFacade', async () => {
      await service.invalidateCache();
      expect(loansFacade.invalidateCache).toHaveBeenCalled();
    });
  });

  describe(LoanHelperService.prototype.deleteWinningOffer.name, () => {
    it('forwards the winning offer key to offersFacade', async () => {
      const key = {
        lender: '0xlender',
        nftContract: '0xnft',
        nftTokenId: '99',
        currency: '0xerc20',
        principal: '100',
        repaymentMax: '110',
        duration: 86400
      };

      await service.deleteWinningOffer(key);

      expect(offersFacade.deleteWinningOffer).toHaveBeenCalledWith(key);
    });
  });

  describe(LoanHelperService.prototype.getAsset.name, () => {
    it('returns asset when found', async () => {
      const asset = buildAssetDto();
      assetsFacade.getAssetByKey.mockResolvedValue(asset);

      const result = await service.getAsset('0xnft', '42', '0xcontract#1');

      expect(assetsFacade.getAssetByKey).toHaveBeenCalledWith('0xnft', '42');
      expect(result).toBe(asset);
    });

    it('throws when asset is not found', async () => {
      assetsFacade.getAssetByKey.mockResolvedValue(null);

      await expect(service.getAsset('0xnft', '42', '0xcontract#1')).rejects.toThrow(
        'Asset not found for loan 0xcontract#1: 0xnft#42'
      );
    });
  });

  describe(LoanHelperService.prototype.getLoanByKey.name, () => {
    it('returns loan when found', async () => {
      const loan = buildPostgresMarketLoan({ id: 5, contract: '0xabc', loanId: '99' });
      loanRepository.findByKey.mockResolvedValue(loan);

      const result = await service.getLoanByKey('0xabc', '99');

      expect(loanRepository.findByKey).toHaveBeenCalledWith('0xabc', '99');
      expect(result).toBe(loan);
    });

    it('throws when loan is not found', async () => {
      loanRepository.findByKey.mockResolvedValue(null);

      await expect(service.getLoanByKey('0xabc', '99')).rejects.toThrow('Loan not found: contract=0xabc loanId=99');
    });
  });

  describe(LoanHelperService.prototype.getAmounts.name, () => {
    it('populates only string fields', async () => {
      fxRates.getRateAtDate.mockResolvedValue(3000);
      supportedCurrencies.calculateUsdAmount.mockReturnValue(12);
      supportedCurrencies.calculateEthAmount.mockReturnValue(6);

      const result = await service.getAmounts(
        {
          principal: '100',
          repaymentMax: '150',
          interest: '50',
          adminFee: '5'
        },
        '0xERC20',
        new Date('2024-01-01T00:00:00.000Z')
      );

      expect(result).toEqual(
        expect.objectContaining({
          principalUsd: 12,
          principalEth: 6,
          repaymentMaxUsd: 12,
          repaymentMaxEth: 6,
          interestUsd: 12,
          interestEth: 6,
          adminFeeUsd: 12,
          adminFeeEth: 6
        })
      );
    });

    it('returns input when no amount fields are strings', async () => {
      fxRates.getRateAtDate.mockResolvedValue(1000);

      const result = await service.getAmounts({}, '0xERC20', new Date());

      expect(result).toEqual({});
    });

    it('uses provided rate instead of fetching from fxRates', async () => {
      supportedCurrencies.calculateUsdAmount.mockReturnValue(15);
      supportedCurrencies.calculateEthAmount.mockReturnValue(7);

      const result = await service.getAmounts(
        { principal: '100' },
        '0xERC20',
        new Date('2024-01-01T00:00:00.000Z'),
        5000
      );

      expect(fxRates.getRateAtDate).not.toHaveBeenCalled();
      expect(supportedCurrencies.calculateUsdAmount).toHaveBeenCalledWith('0xERC20', '100', 5000);
      expect(result).toEqual(
        expect.objectContaining({
          principal: '100',
          principalUsd: 15,
          principalEth: 7
        })
      );
    });

    it('populates repayment and origination fee amounts', async () => {
      fxRates.getRateAtDate.mockResolvedValue(2000);
      supportedCurrencies.calculateUsdAmount.mockReturnValue(8);
      supportedCurrencies.calculateEthAmount.mockReturnValue(4);

      const result = await service.getAmounts(
        {
          repayment: '130',
          originationFee: '5'
        },
        '0xERC20',
        new Date('2024-01-01T00:00:00.000Z')
      );

      expect(result).toEqual(
        expect.objectContaining({
          repaymentUsd: 8,
          repaymentEth: 4,
          originationFeeUsd: 8,
          originationFeeEth: 4
        })
      );
    });
  });

  describe(LoanHelperService.prototype.markOverdueLoansAsDefaulted.name, () => {
    it('marks only overdue loans whose contracts are replayed', async () => {
      loanRepository.findOverdue.mockResolvedValue([
        buildPostgresMarketLoan({ id: 10, contract: '0xaaa' }),
        buildPostgresMarketLoan({ id: 11, contract: '0xbbb' }),
        buildPostgresMarketLoan({ id: 12, contract: '0xccc' })
      ]);
      contractRepository.findByAddress.mockImplementation((address: string) => {
        if (address === '0xaaa') return { replayed: true };
        if (address === '0xbbb') return { replayed: false };
        return null;
      });

      await service.markOverdueLoansAsDefaulted(MarketLoanProtocol.Nftfi);

      expect(loanRepository.findOverdue).toHaveBeenCalledWith(MarketLoanProtocol.Nftfi, expect.any(Date), {
        skip: 0,
        limit: 100
      });
      expect(loanRepository.updateByIds).toHaveBeenCalledTimes(1);
      expect(loanRepository.updateByIds).toHaveBeenCalledWith([10], { status: MarketLoanStatus.Defaulted });
      expect(loansFacade.invalidateCache).toHaveBeenCalled();
    });

    it('does not update when no overdue loans are replayed', async () => {
      loanRepository.findOverdue.mockResolvedValue([
        buildPostgresMarketLoan({ id: 21, contract: '0xddd' }),
        buildPostgresMarketLoan({ id: 22, contract: '0xeee' })
      ]);
      contractRepository.findByAddress.mockReturnValue({ replayed: false });

      await service.markOverdueLoansAsDefaulted(MarketLoanProtocol.Gondi);

      expect(loanRepository.updateByIds).not.toHaveBeenCalled();
      expect(loansFacade.invalidateCache).not.toHaveBeenCalled();
    });

    it('does not update when overdue loan list is empty', async () => {
      loanRepository.findOverdue.mockResolvedValue([]);

      await service.markOverdueLoansAsDefaulted(MarketLoanProtocol.Nftfi);

      expect(loanRepository.updateByIds).not.toHaveBeenCalled();
      expect(loansFacade.invalidateCache).not.toHaveBeenCalled();
    });
  });
});
