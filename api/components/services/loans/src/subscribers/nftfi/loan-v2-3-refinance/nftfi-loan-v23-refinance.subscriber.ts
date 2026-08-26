import { EventHandler, Subscriber } from '@nftfi.api/modules/ethers-observer';
import { NftfiLoanV23RefinanceContract } from './nftfi-loan-v23-refinance.contract';

@Subscriber(NftfiLoanV23RefinanceContract)
export class NftfiLoanV23RefinanceSubscriber {
  @EventHandler(NftfiLoanV23RefinanceContract.Event.Refinanced)
  async onRefinanced(): Promise<void> {
    void 0;
  }
}
