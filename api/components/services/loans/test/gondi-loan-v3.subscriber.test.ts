import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { buildContract } from '@nftfi.api/modules/ethers-observer/factories/contract.factory';
import { GondiLoanService, GondiLoanV3Subscriber, GondiLoanV3Contract } from '../src/subscribers/gondi';

jest.mock('@ethersproject/contracts', () => ({
  Contract: class {}
}));

describe(GondiLoanV3Subscriber.name, () => {
  let subscriber: GondiLoanV3Subscriber;
  let loanService: GondiLoanService;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => void 0);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => void 0);
  });

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [],
      providers: [
        GondiLoanV3Subscriber,
        {
          provide: GondiLoanService,
          useValue: { create: jest.fn(), refinance: jest.fn(), repay: jest.fn(), liquidate: jest.fn() }
        }
      ]
    }).compile();

    subscriber = moduleRef.get(GondiLoanV3Subscriber);
    loanService = moduleRef.get(GondiLoanService);
  });

  describe(GondiLoanV3Subscriber.prototype.onLoanStarted.name, () => {
    it('calls service create method', async () => {
      const fnCreate = jest.spyOn(loanService, 'create').mockResolvedValueOnce();
      const contract = buildContract() as GondiLoanV3Contract;

      await subscriber.onLoanStarted(
        contract,
        {
          loanId: '1',
          offeId: '2',
          fee: '1000',
          loan: {
            protocolFee: '1000',
            borrower: 'borrower',
            nftCollateralTokenId: 'tokenId',
            nftCollateralAddress: '0xabc',
            principalAddress: '0xdef',
            principalAmount: '1000',
            startTime: '1234567890',
            duration: '3600',
            tranche: [
              {
                loanId: '1',
                lender: 'lender',
                principalAmount: '1000',
                accruedInterest: '100',
                startTime: '1234567890',
                aprBps: '500',
                floor: '0'
              }
            ]
          }
        },
        new Date(1234567890 * 1000),
        '0x0'
      );

      expect(fnCreate).toHaveBeenCalledTimes(1);
      expect(fnCreate).toHaveBeenCalledWith(
        contract,
        {
          loanId: '1',
          borrower: 'borrower',
          feeAmount: '1000',
          nftCollateralTokenId: 'tokenId',
          nftCollateralAddress: '0xabc',
          principalAddress: '0xdef',
          principalAmount: '1000',
          startTime: '1234567890',
          duration: '3600',
          sources: [
            {
              lender: 'lender',
              principalAmount: '1000',
              accruedInterest: '100',
              aprBps: '500'
            }
          ]
        },
        new Date('2009-02-13T23:31:30.000Z'),
        '0x0'
      );
    });
  });

  describe(GondiLoanV3Subscriber.prototype.onLoanRefinanced.name, () => {
    it('calls service refinance method', async () => {
      const fnRefinance = jest.spyOn(loanService, 'refinance').mockResolvedValueOnce();
      const contract = buildContract() as GondiLoanV3Contract;

      await subscriber.onLoanRefinanced(
        contract,
        {
          newLoanId: '2',
          oldLoanId: '1',
          renegotiationId: '3',
          fee: '500000',
          loan: {
            protocolFee: '500',
            borrower: 'borrower',
            nftCollateralTokenId: 'tokenId',
            nftCollateralAddress: '0xabc',
            principalAddress: '0xdef',
            principalAmount: '1000',
            startTime: '1234567890',
            duration: '3600',
            tranche: [
              {
                loanId: '1',
                floor: '0',
                lender: 'lender',
                principalAmount: '1000',
                accruedInterest: '100',
                startTime: '1234567890',
                aprBps: '500'
              }
            ]
          }
        },
        new Date(),
        '0x0'
      );

      expect(fnRefinance).toHaveBeenCalledTimes(1);
      expect(fnRefinance).toHaveBeenCalledWith(
        contract,
        {
          newLoanId: '2',
          oldLoanId: '1',
          feeAmount: '500000',
          borrower: 'borrower',
          nftCollateralTokenId: 'tokenId',
          nftCollateralAddress: '0xabc',
          principalAddress: '0xdef',
          principalAmount: '1000',
          startTime: '1234567890',
          duration: '3600',
          sources: [
            {
              lender: 'lender',
              principalAmount: '1000',
              accruedInterest: '100',
              aprBps: '500'
            }
          ]
        },
        expect.any(Date),
        '0x0'
      );
    });
  });

  describe(GondiLoanV3Subscriber.prototype.onLoanRefinancedNewOffer.name, () => {
    it('calls service refinance method', async () => {
      const fnRefinance = jest.spyOn(loanService, 'refinance').mockResolvedValueOnce();
      const contract = buildContract() as GondiLoanV3Contract;

      await subscriber.onLoanRefinancedNewOffer(
        contract,
        {
          newLoanId: '2',
          loanId: '1',
          offerIds: ['3'],
          totalFee: '500',
          loan: {
            protocolFee: '500',
            borrower: 'borrower',
            nftCollateralTokenId: 'tokenId',
            nftCollateralAddress: '0xabc',
            principalAddress: '0xdef',
            principalAmount: '1000',
            startTime: '1234567890',
            duration: '3600',
            tranche: [
              {
                loanId: '1',
                floor: '0',
                lender: 'lender',
                principalAmount: '1000',
                accruedInterest: '100',
                startTime: '1234567890',
                aprBps: '500'
              }
            ]
          }
        },
        new Date(),
        '0x0'
      );

      expect(fnRefinance).toHaveBeenCalledTimes(1);
      expect(fnRefinance).toHaveBeenCalledWith(
        contract,
        {
          newLoanId: '2',
          oldLoanId: '1',
          feeAmount: '500',
          borrower: 'borrower',
          nftCollateralTokenId: 'tokenId',
          nftCollateralAddress: '0xabc',
          principalAddress: '0xdef',
          principalAmount: '1000',
          startTime: '1234567890',
          duration: '3600',
          sources: [
            {
              lender: 'lender',
              principalAmount: '1000',
              accruedInterest: '100',
              aprBps: '500'
            }
          ]
        },
        expect.any(Date),
        '0x0'
      );
    });
  });

  describe(GondiLoanV3Subscriber.prototype.onLoanRepaid.name, () => {
    it('calls service repay method', async () => {
      const fnRepay = jest.spyOn(loanService, 'repay').mockResolvedValueOnce();
      const contract = buildContract() as GondiLoanV3Contract;

      await subscriber.onLoanRepaid(
        contract,
        {
          loanId: '1',
          totalRepayment: '1000',
          fee: '100'
        },
        new Date(),
        '0x0'
      );

      expect(fnRepay).toHaveBeenCalledTimes(1);
      expect(fnRepay).toHaveBeenCalledWith(
        contract,
        {
          loanId: '1',
          totalRepayment: '1000',
          fee: '100'
        },
        expect.any(Date),
        '0x0'
      );
    });
  });

  describe(GondiLoanV3Subscriber.prototype.onLoanLiquidated.name, () => {
    it('calls service liquidate method', async () => {
      const fnLiquidate = jest.spyOn(loanService, 'liquidate').mockResolvedValueOnce();
      const contract = buildContract() as GondiLoanV3Contract;

      await subscriber.onLoanLiquidated(
        contract,
        {
          loanId: '1'
        },
        new Date(),
        '0x0'
      );

      expect(fnLiquidate).toHaveBeenCalledTimes(1);
      expect(fnLiquidate).toHaveBeenCalledWith(
        contract,
        {
          loanId: '1'
        },
        expect.any(Date),
        '0x0'
      );
    });
  });

  describe(GondiLoanV3Subscriber.prototype.onLoanForeclosed.name, () => {
    it('calls service foreclose method', async () => {
      const fnForeclose = jest.spyOn(loanService, 'liquidate').mockResolvedValueOnce();
      const contract = buildContract() as GondiLoanV3Contract;

      await subscriber.onLoanForeclosed(
        contract,
        {
          loanId: '1'
        },
        new Date(),
        '0x0'
      );

      expect(fnForeclose).toHaveBeenCalledTimes(1);
      expect(fnForeclose).toHaveBeenCalledWith(
        contract,
        {
          loanId: '1'
        },
        expect.any(Date),
        '0x0'
      );
    });
  });
});
