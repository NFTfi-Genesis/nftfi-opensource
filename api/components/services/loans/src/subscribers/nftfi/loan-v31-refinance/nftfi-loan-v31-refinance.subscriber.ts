import { EventHandler, Subscriber } from '@nftfi.api/modules/ethers-observer';
import { NftfiLoanV31RefinanceContract } from './nftfi-loan-v31-refinance.contract';

@Subscriber(NftfiLoanV31RefinanceContract)
export class NftfiLoanV31RefinanceSubscriber {
  @EventHandler(NftfiLoanV31RefinanceContract.Event.Refinanced)
  async onRefinanced(): Promise<void> {
    void 0;
  }
}
