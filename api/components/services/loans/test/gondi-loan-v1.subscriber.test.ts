import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { buildContract } from '@nftfi.api/modules/ethers-observer/factories/contract.factory';
import { GondiLoanV1Subscriber, GondiLoanService, GondiLoanV1Contract } from '../src/subscribers/gondi';
// TODO: Gondi implementation now lives under services/loans; keep this cross-service import until test ownership is clarified.

jest.mock('@ethersproject/contracts', () => ({
  Contract: class {}
}));

describe(GondiLoanV1Subscriber.name, () => {
  let subscriber: GondiLoanV1Subscriber;
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
        GondiLoanV1Subscriber,
        {
          provide: GondiLoanService,
          useValue: { create: jest.fn(), refinance: jest.fn(), repay: jest.fn(), liquidate: jest.fn() }
        }
      ]
    }).compile();

    subscriber = moduleRef.get(GondiLoanV1Subscriber);
    loanService = moduleRef.get(GondiLoanService);
  });

  describe(GondiLoanV1Subscriber.prototype.onLoanStarted.name, () => {
    it('calls service create method', async () => {
      const fnCreate = jest.spyOn(loanService, 'create').mockResolvedValueOnce();
      const contract = buildContract() as GondiLoanV1Contract;

      await subscriber.onLoanStarted(
        contract,
        {
          loanId: '1',
          offerId: '2',
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

    it('calls service create method with zero fee', async () => {
      const fnCreate = jest.spyOn(loanService, 'create').mockResolvedValueOnce();
      const contract = buildContract() as GondiLoanV1Contract;

      await subscriber.onLoanStarted(
        contract,
        {
          loanId: '1',
          offerId: '2',
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
          borrower: 'borrower',
          feeAmount: '0',
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

  describe(GondiLoanV1Subscriber.prototype.onLoanRefinanced.name, () => {
    it('calls service refinance method', async () => {
      const fnRefinance = jest.spyOn(loanService, 'refinance').mockResolvedValueOnce();
      const contract = buildContract() as GondiLoanV1Contract;

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

    it('calls service refinance method with zero fee', async () => {
      const fnRefinance = jest.spyOn(loanService, 'refinance').mockResolvedValueOnce();
      const contract = buildContract() as GondiLoanV1Contract;

      await subscriber.onLoanRefinanced(
        contract,
        {
          newLoanId: '2',
          oldLoanId: '1',
          renegotiationId: '3',
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
          feeAmount: '0',
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

  describe(GondiLoanV1Subscriber.prototype.onLoanRepaid.name, () => {
    it('calls service repay method', async () => {
      const fnRepay = jest.spyOn(loanService, 'repay').mockResolvedValueOnce();
      const contract = buildContract() as GondiLoanV1Contract;

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

  describe(GondiLoanV1Subscriber.prototype.onLoanLiquidated.name, () => {
    it('calls service liquidate method', async () => {
      const fnLiquidate = jest.spyOn(loanService, 'liquidate').mockResolvedValueOnce();
      const contract = buildContract() as GondiLoanV1Contract;

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

  describe(GondiLoanV1Subscriber.prototype.onLoanForeclosed.name, () => {
    it('calls service liquidate method', async () => {
      const fnLiquidate = jest.spyOn(loanService, 'liquidate').mockResolvedValueOnce();
      const contract = buildContract() as GondiLoanV1Contract;

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
