import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { buildContract } from '@nftfi.api/modules/ethers-observer/factories/contract.factory';
import { GondiLoanV2Subscriber, GondiLoanService, GondiLoanV2Contract } from '../src/subscribers/gondi';

jest.mock('@ethersproject/contracts', () => ({
  Contract: class {}
}));

describe(GondiLoanV2Subscriber.name, () => {
  let subscriber: GondiLoanV2Subscriber;
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
        GondiLoanV2Subscriber,
        {
          provide: GondiLoanService,
          useValue: { create: jest.fn(), refinance: jest.fn(), repay: jest.fn(), liquidate: jest.fn() }
        }
      ]
    }).compile();

    subscriber = moduleRef.get(GondiLoanV2Subscriber);
    loanService = moduleRef.get(GondiLoanService);
  });

  describe(GondiLoanV2Subscriber.prototype.onLoanStarted.name, () => {
    it('calls service create method', async () => {
      const fnCreate = jest.spyOn(loanService, 'create').mockResolvedValueOnce();
      const contract = buildContract() as GondiLoanV2Contract;

      await subscriber.onLoanStarted(
        contract,
        {
          loanId: '1',
          offerId: '2',
          lender: '0x123',
          borrower: '0x456',
          fee: '1000',
          loan: {
            borrower: 'borrower',
            nftCollateralTokenId: 'tokenId',
            nftCollateralAddress: '0xabc',
            principalAddress: '0xdef',
            principalAmount: '1000',
            startTime: '1234567890',
            duration: '3600',
            source: [
              {
                loanId: '1',
                lender: 'lender',
                principalAmount: '1000',
                accruedInterest: '100',
                startTime: '1234567890',
                aprBps: '500'
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
          borrower: '0x456',
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

  describe(GondiLoanV2Subscriber.prototype.onLoanRefinanced.name, () => {
    it('calls service refinance method', async () => {
      const fnRefinance = jest.spyOn(loanService, 'refinance').mockResolvedValueOnce();
      const contract = buildContract() as GondiLoanV2Contract;

      await subscriber.onLoanRefinanced(
        contract,
        {
          newLoanId: '2',
          oldLoanId: '1',
          renegotiationId: '3',
          fee: '500',
          loan: {
            borrower: 'borrower',
            nftCollateralTokenId: 'tokenId',
            nftCollateralAddress: '0xabc',
            principalAddress: '0xdef',
            principalAmount: '1000',
            startTime: '1234567890',
            duration: '3600',
            source: [
              {
                loanId: '1',
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

  describe(GondiLoanV2Subscriber.prototype.onLoanRepaid.name, () => {
    it('calls service repay method', async () => {
      const fnRepay = jest.spyOn(loanService, 'repay').mockResolvedValueOnce();
      const contract = buildContract() as GondiLoanV2Contract;

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

  describe(GondiLoanV2Subscriber.prototype.onLoanLiquidated.name, () => {
    it('calls service liquidate method', async () => {
      const fnLiquidate = jest.spyOn(loanService, 'liquidate').mockResolvedValueOnce();
      const contract = buildContract() as GondiLoanV2Contract;

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

  describe(GondiLoanV2Subscriber.prototype.onLoanForeclosed.name, () => {
    it('calls service liquidate method', async () => {
      const fnLiquidate = jest.spyOn(loanService, 'liquidate').mockResolvedValueOnce();
      const contract = buildContract() as GondiLoanV2Contract;

      await subscriber.onLoanForeclosed(
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
});
