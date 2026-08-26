import { NotFoundException, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import * as express from 'express';
import {
  MarketLoanProtocol,
  MarketLoanRepository,
  MarketLoanStatus
} from '@nftfi.api/repositories/postgres/market-loan';
import { buildPostgresMarketLoan } from '@nftfi.api/repositories/postgres/factories/market-loan';
import { RenegotiationV1OfferValidationPipe } from '../src/renegotiation-v1/pipes';
import { DraftRenegotiationV1Dto } from '../src/renegotiation-v1/dtos';

const buildAuthHeader = (account: string): string => {
  const payload = Buffer.from(JSON.stringify({ account })).toString('base64');
  return `Bearer test.${payload}.test`;
};

const buildRequest = (authorization?: string): express.Request =>
  ({
    get: (name: string) => (name === 'Authorization' || name === 'authorization' ? authorization : undefined)
  } as unknown as express.Request);

const buildDraft = (overrides: Partial<DraftRenegotiationV1Dto> = {}): DraftRenegotiationV1Dto =>
  ({
    loan: { id: 42 },
    lender: { address: '0xlender', nonce: 'n-1' },
    terms: {
      loan: {
        duration: 86400,
        renegotiationFee: '10000000000000000',
        expiresAt: new Date('2099-06-19T23:30:18.000Z')
      }
    },
    signature: '0xsig',
    message: null,
    ...overrides
  } as DraftRenegotiationV1Dto);

describe(RenegotiationV1OfferValidationPipe.name, () => {
  let marketLoanRepository: jest.Mocked<Pick<MarketLoanRepository, 'findById'>>;

  const build = (authorization: string | undefined): RenegotiationV1OfferValidationPipe =>
    new RenegotiationV1OfferValidationPipe(
      buildRequest(authorization),
      marketLoanRepository as unknown as MarketLoanRepository
    );

  beforeEach(() => {
    jest.resetAllMocks();
    marketLoanRepository = { findById: jest.fn() };
  });

  describe('lender-is-caller auth', () => {
    it('throws Unauthorized when no Authorization header is present', async () => {
      const pipe = build(undefined);

      await expect(pipe.transform(buildDraft())).rejects.toThrow(UnauthorizedException);
      expect(marketLoanRepository.findById).not.toHaveBeenCalled();
    });

    it('throws Unauthorized when authenticated account does not match the lender address', async () => {
      const pipe = build(buildAuthHeader('0x1111111111111111111111111111111111111111'));

      await expect(pipe.transform(buildDraft())).rejects.toThrow(UnauthorizedException);
      expect(marketLoanRepository.findById).not.toHaveBeenCalled();
    });

    it('matches account address case-insensitively', async () => {
      const pipe = build(buildAuthHeader('0xLENDER'));
      marketLoanRepository.findById.mockResolvedValue(
        buildPostgresMarketLoan({ lender: '0xlender', status: MarketLoanStatus.Defaulted })
      );

      await expect(pipe.transform(buildDraft())).resolves.toBeDefined();
    });
  });

  describe('loan lookup', () => {
    it('throws NotFound when the loan cannot be found by id', async () => {
      const pipe = build(buildAuthHeader('0xlender'));
      marketLoanRepository.findById.mockResolvedValue(null);

      await expect(pipe.transform(buildDraft())).rejects.toThrow(NotFoundException);
      expect(marketLoanRepository.findById).toHaveBeenCalledWith(42);
    });

    it('throws Unprocessable when the loan is not an NFTfi loan', async () => {
      const pipe = build(buildAuthHeader('0xlender'));
      marketLoanRepository.findById.mockResolvedValue(
        buildPostgresMarketLoan({ lender: '0xlender', protocol: MarketLoanProtocol.Gondi })
      );

      await expect(pipe.transform(buildDraft())).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws Unprocessable when the loan is not defaulted', async () => {
      const pipe = build(buildAuthHeader('0xlender'));
      marketLoanRepository.findById.mockResolvedValue(
        buildPostgresMarketLoan({ lender: '0xlender', status: MarketLoanStatus.Active })
      );

      await expect(pipe.transform(buildDraft())).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws Unauthorized when the loan lender does not match the draft lender', async () => {
      const pipe = build(buildAuthHeader('0xlender'));
      marketLoanRepository.findById.mockResolvedValue(
        buildPostgresMarketLoan({
          borrower: '0xborrower',
          lender: '0xotherlender',
          status: MarketLoanStatus.Defaulted
        })
      );

      await expect(pipe.transform(buildDraft())).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('returns the draft once all checks pass', () => {
    it('allows a lender offer that matches a defaulted NFTfi loan', async () => {
      const pipe = build(buildAuthHeader('0xlender'));
      marketLoanRepository.findById.mockResolvedValue(
        buildPostgresMarketLoan({ borrower: '0xborrower', lender: '0xlender', status: MarketLoanStatus.Defaulted })
      );

      const draft = buildDraft();
      await expect(pipe.transform(draft)).resolves.toBe(draft);
    });
  });
});
