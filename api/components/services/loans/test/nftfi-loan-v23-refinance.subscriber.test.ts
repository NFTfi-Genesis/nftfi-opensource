import { Test } from '@nestjs/testing';
import { NftfiLoanV23RefinanceSubscriber } from '../src/subscribers/nftfi/loan-v2-3-refinance';

jest.mock('@ethersproject/contracts', () => ({
  Contract: class {}
}));

describe(NftfiLoanV23RefinanceSubscriber.name, () => {
  let subscriber: NftfiLoanV23RefinanceSubscriber;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [NftfiLoanV23RefinanceSubscriber]
    }).compile();

    subscriber = moduleRef.get(NftfiLoanV23RefinanceSubscriber);
  });

  describe(NftfiLoanV23RefinanceSubscriber.prototype.onRefinanced.name, () => {
    it('does not throw for refinance events', async () => {
      await expect(subscriber.onRefinanced()).resolves.toBeUndefined();
    });
  });
});
