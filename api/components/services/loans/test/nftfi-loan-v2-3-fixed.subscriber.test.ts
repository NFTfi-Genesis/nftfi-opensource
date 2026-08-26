import { Test } from '@nestjs/testing';
import { NftfiLoanService } from '../src/subscribers/nftfi/nftfi-loan.service';
import { NftfiLoanV23FixedSubscriber } from '../src/subscribers/nftfi/loan-v2-3-fixed';

jest.mock('@ethersproject/contracts', () => ({
  Contract: class {}
}));

describe(NftfiLoanV23FixedSubscriber.name, () => {
  let subscriber: NftfiLoanV23FixedSubscriber;
  let loanService: NftfiLoanService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        NftfiLoanV23FixedSubscriber,
        {
          provide: NftfiLoanService,
          useValue: {
            create: jest.fn(),
            renegotiate: jest.fn(),
            repay: jest.fn(),
            liquidate: jest.fn()
          }
        }
      ]
    }).compile();

    subscriber = moduleRef.get(NftfiLoanV23FixedSubscriber);
    loanService = moduleRef.get(NftfiLoanService);
  });

  describe(NftfiLoanV23FixedSubscriber.prototype.onLoanStarted.name, () => {
    it('calls create with normalized payload and metadata', async () => {
      const fnCreate = jest.spyOn(loanService, 'create').mockResolvedValueOnce(undefined);

      await subscriber.onLoanStarted(
        {
          loanId: '1',
          lender: '0xlender',
          borrower: '0xborrower',
          loanTerms: {
            loanStartTime: '1234567890',
            loanDuration: 3600,
            loanPrincipalAmount: '1000',
            maximumRepaymentAmount: '1100',
            loanAdminFeeInBasisPoints: 250,
            loanInterestRateForDurationInBasisPoints: 0,
            loanERC20Denomination: '0xerc20',
            nftCollateralContract: '0xnft',
            nftCollateralId: '123',
            nftCollateralWrapper: '0xwrapper',
            borrower: '0xborrower'
          }
        },
        'event-1',
        '0xtx',
        42,
        '0xcontract'
      );

      expect(fnCreate).toHaveBeenCalledTimes(1);
      expect(fnCreate).toHaveBeenCalledWith(
        {
          loanId: '1',
          lender: '0xlender',
          borrower: '0xborrower',
          loanStartTime: '1234567890',
          loanDuration: 3600,
          loanPrincipalAmount: '1000',
          maximumRepaymentAmount: '1100',
          loanAdminFeeInBasisPoints: 250,
          originationFee: '0',
          loanERC20Denomination: '0xerc20',
          nftCollateralContract: '0xnft',
          nftCollateralId: '123',
          isProRata: false
        },
        { eventId: 'event-1', blockNumber: 42, contract: '0xcontract', tx: '0xtx' }
      );
    });
  });

  describe(NftfiLoanV23FixedSubscriber.prototype.onLoanRenegotiated.name, () => {
    it('calls renegotiate with payload and metadata', async () => {
      const fnRenegotiate = jest.spyOn(loanService, 'renegotiate').mockResolvedValueOnce(undefined);
      const emittedAt = new Date('2025-01-01T00:00:00Z');

      await subscriber.onLoanRenegotiated('event-2', '0xcontract', emittedAt, 500, {
        loanId: '1',
        newMaximumRepaymentAmount: '1200',
        newLoanDuration: 7200,
        renegotiationFee: '0',
        renegotiationAdminFee: '0',
        borrower: '0xborrower',
        lender: '0xlender'
      });

      expect(fnRenegotiate).toHaveBeenCalledTimes(1);
      expect(fnRenegotiate).toHaveBeenCalledWith(
        {
          loanId: '1',
          newMaximumRepaymentAmount: '1200',
          newLoanDuration: 7200,
          isProRata: false
        },
        { eventId: 'event-2', contract: '0xcontract', emittedAt, blockNumber: 500 }
      );
    });
  });

  describe(NftfiLoanV23FixedSubscriber.prototype.onLoanLiquidated.name, () => {
    it('calls liquidate with payload and metadata', async () => {
      const fnLiquidate = jest.spyOn(loanService, 'liquidate').mockResolvedValueOnce(undefined);
      const emittedAt = new Date('2025-01-01T00:00:00Z');

      await subscriber.onLoanLiquidated(
        {
          loanId: '1',
          borrower: '0xborrower',
          lender: '0xlender',
          loanPrincipalAmount: '1000',
          nftCollateralId: '123',
          nftCollateralContract: '0xnft',
          loanMaturityDate: '1700000000',
          loanLiquidationDate: '1700001000'
        },
        'event-3',
        '0xtx',
        emittedAt,
        500,
        '0xcontract'
      );

      expect(fnLiquidate).toHaveBeenCalledTimes(1);
      expect(fnLiquidate).toHaveBeenCalledWith(
        { loanId: '1' },
        { eventId: 'event-3', contract: '0xcontract', tx: '0xtx', emittedAt, blockNumber: 500 }
      );
    });
  });

  describe(NftfiLoanV23FixedSubscriber.prototype.onLoanRepaid.name, () => {
    it('calls repay with payload and metadata', async () => {
      const fnRepay = jest.spyOn(loanService, 'repay').mockResolvedValueOnce(undefined);
      const emittedAt = new Date('2025-01-01T00:00:00Z');

      await subscriber.onLoanRepaid(
        {
          loanId: '1',
          borrower: '0xborrower',
          lender: '0xlender',
          adminFee: '5',
          loanPrincipalAmount: '1000',
          amountPaidToLender: '1100',
          revenueShare: '0',
          revenueSharePartner: '0xpartner',
          loanERC20Denomination: '0xerc20',
          nftCollateralContract: '0xnft',
          nftCollateralId: '123'
        },
        'event-4',
        '0xtx',
        emittedAt,
        42,
        '0xcontract'
      );

      expect(fnRepay).toHaveBeenCalledTimes(1);
      expect(fnRepay).toHaveBeenCalledWith(
        {
          loanId: '1',
          borrower: '0xborrower',
          adminFee: '5',
          loanPrincipalAmount: '1000',
          amountPaidToLender: '1100'
        },
        { eventId: 'event-4', contract: '0xcontract', blockNumber: 42, tx: '0xtx', emittedAt }
      );
    });
  });
});
