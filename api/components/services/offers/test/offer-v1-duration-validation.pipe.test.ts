import { UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { OfferType } from '@nftfi.api/repositories/postgres/offer';
import { OfferV1DurationValidationPipe } from '../src/offer-v1/pipes';
import { DraftOfferV1Dto } from '../src/offer-v1/dtos';

const buildDraft = (duration: number): DraftOfferV1Dto =>
  ({
    type: OfferType.Asset,
    lender: { address: '0xlender', nonce: '1' },
    borrower: { address: '0xborrower' },
    nft: { contract: '0xnft', tokenId: '1' },
    terms: {
      loan: {
        duration,
        principal: '1000000000000000000',
        repayment: '1100000000000000000',
        origination: '0',
        currency: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
        expiresAt: new Date('2099-06-19T23:30:18.000Z'),
        prorated: false
      }
    },
    signature: '0xsig'
  } as DraftOfferV1Dto);

describe(OfferV1DurationValidationPipe.name, () => {
  let pipe: OfferV1DurationValidationPipe;
  let configService: jest.Mocked<Pick<ConfigService, 'get'>>;

  beforeEach(async () => {
    jest.resetAllMocks();

    configService = { get: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [OfferV1DurationValidationPipe, { provide: ConfigService, useValue: configService }]
    }).compile();

    pipe = moduleRef.get(OfferV1DurationValidationPipe);
  });

  it('uses the configured minimum and accepts a multiple', () => {
    configService.get.mockReturnValue(86400);
    const draft = buildDraft(172800);

    expect(pipe.transform(draft)).toBe(draft);
  });

  it('rejects durations that are not a multiple of the configured minimum', () => {
    configService.get.mockReturnValue(86400);

    try {
      pipe.transform(buildDraft(172801));
      fail('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect((error as UnprocessableEntityException).getResponse()).toEqual({
        errors: {
          'terms.loan.duration': [
            'duration must be specified in seconds, and in 86400 seconds increments (eg. 86400, 172800, 259200)'
          ]
        }
      });
    }
  });

  it('falls back to the default minimum when the config value is not numeric', () => {
    configService.get.mockReturnValue(undefined);

    expect(pipe.transform(buildDraft(86400))).toBeDefined();
    expect(() => pipe.transform(buildDraft(100))).toThrow(UnprocessableEntityException);
  });

  it('rejects zero and negative durations', () => {
    configService.get.mockReturnValue(86400);

    expect(() => pipe.transform(buildDraft(0))).toThrow(UnprocessableEntityException);
    expect(() => pipe.transform(buildDraft(-86400))).toThrow(UnprocessableEntityException);
  });
});
