import { Test } from '@nestjs/testing';
import { NftfiLoanV3RefinanceSubscriber } from '../src/subscribers/nftfi/loan-v3-refinance';

jest.mock('@ethersproject/contracts', () => ({
  Contract: class {}
}));

describe(NftfiLoanV3RefinanceSubscriber.name, () => {
  let subscriber: NftfiLoanV3RefinanceSubscriber;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [NftfiLoanV3RefinanceSubscriber]
    }).compile();

    subscriber = moduleRef.get(NftfiLoanV3RefinanceSubscriber);
  });

  describe(NftfiLoanV3RefinanceSubscriber.prototype.onRefinanced.name, () => {
    it('does not throw for refinance events', async () => {
      await expect(subscriber.onRefinanced()).resolves.toBeUndefined();
    });
  });
});
