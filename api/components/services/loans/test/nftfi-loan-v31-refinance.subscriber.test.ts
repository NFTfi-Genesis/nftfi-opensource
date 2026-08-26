import { Test } from '@nestjs/testing';
import { NftfiLoanV31RefinanceSubscriber } from '../src/subscribers/nftfi/loan-v31-refinance';

jest.mock('@ethersproject/contracts', () => ({
  Contract: class {}
}));

describe(NftfiLoanV31RefinanceSubscriber.name, () => {
  let subscriber: NftfiLoanV31RefinanceSubscriber;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [NftfiLoanV31RefinanceSubscriber]
    }).compile();

    subscriber = moduleRef.get(NftfiLoanV31RefinanceSubscriber);
  });

  describe(NftfiLoanV31RefinanceSubscriber.prototype.onRefinanced.name, () => {
    it('does not throw for refinance events', async () => {
      await expect(subscriber.onRefinanced()).resolves.toBeUndefined();
    });
  });
});
