import { Test } from '@nestjs/testing';
import { BlurLoanSubscriber } from '../src/subscribers/blur/blur-loan.subscriber';
import { BlurLoanService } from '../src/subscribers/blur/blur-loan.service';

jest.mock('@ethersproject/contracts', () => ({ Contract: class {} }));

const CONTRACT_ADDRESS = '0x29469395eaf6f95920e59f858042f0e28d98a20b';
const TX_HASH = '0xe404fbda8ee2a3d5c82cf72e7d8abdce7a20bd41f821b723ef446307f6086477';
const EMITTED_AT = new Date('2026-01-01T00:00:00.000Z');

describe(BlurLoanSubscriber.name, () => {
  let subscriber: BlurLoanSubscriber;
  let loanService: jest.Mocked<Pick<BlurLoanService, 'create' | 'defaulting' | 'refinance' | 'repay' | 'liquidate'>>;

  beforeEach(async () => {
    jest.resetAllMocks();

    loanService = {
      create: jest.fn(),
      defaulting: jest.fn(),
      refinance: jest.fn(),
      repay: jest.fn(),
      liquidate: jest.fn()
    };

    const moduleRef = await Test.createTestingModule({
      providers: [BlurLoanSubscriber, { provide: BlurLoanService, useValue: loanService }]
    }).compile();

    subscriber = moduleRef.get(BlurLoanSubscriber);
  });

  describe(BlurLoanSubscriber.prototype.onLoanCreated.name, () => {
    it('delegates to service.create with all args', async () => {
      const payload = {
        lienId: '42',
        lender: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        borrower: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        loanAmount: '1000000000000000000',
        rate: '2000',
        tokenId: '1234',
        collection: '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d'
      };

      await subscriber.onLoanCreated(CONTRACT_ADDRESS, TX_HASH, EMITTED_AT, payload);

      expect(loanService.create).toHaveBeenCalledTimes(1);
      expect(loanService.create).toHaveBeenCalledWith(
        '0x29469395eaf6f95920e59f858042f0e28d98a20b',
        '0xe404fbda8ee2a3d5c82cf72e7d8abdce7a20bd41f821b723ef446307f6086477',
        new Date('2026-01-01T00:00:00.000Z'),
        payload
      );
    });
  });

  describe(BlurLoanSubscriber.prototype.onLoanDefaulting.name, () => {
    it('extracts lienId from payload and delegates to service.defaulting', async () => {
      await subscriber.onLoanDefaulting(CONTRACT_ADDRESS, TX_HASH, EMITTED_AT, { lienId: '42' });

      expect(loanService.defaulting).toHaveBeenCalledTimes(1);
      expect(loanService.defaulting).toHaveBeenCalledWith(
        '0x29469395eaf6f95920e59f858042f0e28d98a20b',
        '0xe404fbda8ee2a3d5c82cf72e7d8abdce7a20bd41f821b723ef446307f6086477',
        new Date('2026-01-01T00:00:00.000Z'),
        '42'
      );
    });
  });

  describe(BlurLoanSubscriber.prototype.onLoanRefinanced.name, () => {
    it('delegates to service.refinance without txHash', async () => {
      const payload = {
        lienId: '42',
        collection: '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d',
        newLender: '0xcccccccccccccccccccccccccccccccccccccccc',
        newAmount: '2000000000000000000',
        newRate: '1000'
      };

      await subscriber.onLoanRefinanced(CONTRACT_ADDRESS, TX_HASH, EMITTED_AT, payload);

      expect(loanService.refinance).toHaveBeenCalledTimes(1);
      expect(loanService.refinance).toHaveBeenCalledWith(
        '0x29469395eaf6f95920e59f858042f0e28d98a20b',
        new Date('2026-01-01T00:00:00.000Z'),
        payload
      );
    });
  });

  describe(BlurLoanSubscriber.prototype.onLoanRepaid.name, () => {
    it('extracts lienId from payload and delegates to service.repay', async () => {
      await subscriber.onLoanRepaid(CONTRACT_ADDRESS, TX_HASH, EMITTED_AT, {
        lienId: '42',
        collection: '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d'
      });

      expect(loanService.repay).toHaveBeenCalledTimes(1);
      expect(loanService.repay).toHaveBeenCalledWith(
        '0x29469395eaf6f95920e59f858042f0e28d98a20b',
        '0xe404fbda8ee2a3d5c82cf72e7d8abdce7a20bd41f821b723ef446307f6086477',
        new Date('2026-01-01T00:00:00.000Z'),
        '42'
      );
    });
  });

  describe(BlurLoanSubscriber.prototype.onLoanLiquidated.name, () => {
    it('extracts lienId from payload and delegates to service.liquidate', async () => {
      await subscriber.onLoanLiquidated(CONTRACT_ADDRESS, TX_HASH, EMITTED_AT, { lienId: '42' });

      expect(loanService.liquidate).toHaveBeenCalledTimes(1);
      expect(loanService.liquidate).toHaveBeenCalledWith(
        '0x29469395eaf6f95920e59f858042f0e28d98a20b',
        '0xe404fbda8ee2a3d5c82cf72e7d8abdce7a20bd41f821b723ef446307f6086477',
        new Date('2026-01-01T00:00:00.000Z'),
        '42'
      );
    });
  });
});
