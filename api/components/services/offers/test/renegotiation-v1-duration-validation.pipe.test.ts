import { UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { RenegotiationParty } from '@nftfi.api/repositories/postgres/renegotiation';
import { RenegotiationV1DurationValidationPipe } from '../src/renegotiation-v1/pipes';
import { DraftRenegotiationV1Dto } from '../src/renegotiation-v1/dtos';

const buildDraft = (duration: number): DraftRenegotiationV1Dto =>
  ({
    loan: { id: 42 },
    party: RenegotiationParty.Borrower,
    lender: { address: '0xlender', nonce: null },
    borrower: { address: '0xborrower' },
    terms: {
      loan: {
        duration,
        renegotiationFee: '10000000000000000',
        expiresAt: new Date('2099-06-19T23:30:18.000Z')
      }
    },
    signature: null,
    message: null
  } as DraftRenegotiationV1Dto);

describe(RenegotiationV1DurationValidationPipe.name, () => {
  let pipe: RenegotiationV1DurationValidationPipe;
  let configService: jest.Mocked<Pick<ConfigService, 'get'>>;

  beforeEach(async () => {
    jest.resetAllMocks();

    configService = { get: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [RenegotiationV1DurationValidationPipe, { provide: ConfigService, useValue: configService }]
    }).compile();

    pipe = moduleRef.get(RenegotiationV1DurationValidationPipe);
  });

  it('returns the draft unchanged when duration is within the configured max', () => {
    configService.get.mockReturnValue(365 * 86400);
    const draft = buildDraft(86400);

    expect(pipe.transform(draft)).toBe(draft);
    expect(configService.get).toHaveBeenCalledWith('renegotiation.maxDurationSeconds');
  });

  it('throws Unprocessable when duration is zero', () => {
    configService.get.mockReturnValue(365 * 86400);

    try {
      pipe.transform(buildDraft(0));
      fail('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect((error as UnprocessableEntityException).getResponse()).toEqual({
        errors: { 'terms.loan.duration': ['duration must be a positive integer ≤ 31536000 seconds'] }
      });
    }
  });

  it('throws Unprocessable when duration is negative', () => {
    configService.get.mockReturnValue(365 * 86400);

    expect(() => pipe.transform(buildDraft(-1))).toThrow(UnprocessableEntityException);
  });

  it('throws Unprocessable when duration exceeds the configured max', () => {
    configService.get.mockReturnValue(365 * 86400);

    expect(() => pipe.transform(buildDraft(365 * 86400 + 1))).toThrow(UnprocessableEntityException);
  });

  it('falls back to default max when config is not provided', () => {
    configService.get.mockReturnValue(undefined);

    expect(pipe.transform(buildDraft(365 * 86400))).toBeDefined();
    expect(() => pipe.transform(buildDraft(365 * 86400 + 1))).toThrow(UnprocessableEntityException);
  });
});
