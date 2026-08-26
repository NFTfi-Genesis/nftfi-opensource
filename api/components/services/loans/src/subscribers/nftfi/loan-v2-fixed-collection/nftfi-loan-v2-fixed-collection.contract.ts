import { Contract, ContractBuilder } from '@nftfi.api/modules/ethers-observer';
import ABI from './nftfi-loan-v2-fixed-collection.abi.json';

@ContractBuilder({
  address: config => config.get('ethereum.contracts.nftfi.loanV2FixedCollection.address'),
  replay: {
    startAt: config => config.get('ethereum.contracts.nftfi.loanV2FixedCollection.replayBlock'),
    enabled: false
  },
  ABI
})
export class NftfiLoanV2FixedCollectionContract extends Contract {
  static Event = {
    LoanLiquidated: 'LoanLiquidated',
    LoanRenegotiated: 'LoanRenegotiated',
    LoanRepaid: 'LoanRepaid',
    LoanStarted: 'LoanStarted'
  };
}
