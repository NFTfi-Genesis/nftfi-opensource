import { EventHandler, Subscriber } from '@nftfi.api/modules/ethers-observer';
import { NftfiLoanV3RefinanceContract } from './nftfi-loan-v3-refinance.contract';

@Subscriber(NftfiLoanV3RefinanceContract)
export class NftfiLoanV3RefinanceSubscriber {
  @EventHandler(NftfiLoanV3RefinanceContract.Event.Refinanced)
  async onRefinanced(): Promise<void> {
    void 0;
  }
}
