import { Contract, ContractBuilder } from '@nftfi.api/modules/ethers-observer';
import ABI from './nftfi-loan-v3-collection.abi.json';

@ContractBuilder({
  address: config => config.get('ethereum.contracts.nftfi.loanV3Collection.address'),
  replay: {
    startAt: config => config.get('ethereum.contracts.nftfi.loanV3Collection.replayBlock'),
    enabled: false
  },
  ABI
})
export class NftfiLoanV3CollectionContract extends Contract {
  static Event = {
    LoanLiquidated: 'LoanLiquidated',
    LoanRenegotiated: 'LoanRenegotiated',
    LoanRepaid: 'LoanRepaid',
    LoanStarted: 'LoanStarted'
  };
}
