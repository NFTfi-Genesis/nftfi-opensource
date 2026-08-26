import { Contract, ContractBuilder } from '@nftfi.api/modules/ethers-observer';
import ABI from './nftfi-loan-v1-fixed.abi.json';

@ContractBuilder({
  address: config => config.get('ethereum.contracts.nftfi.loanV1Fixed.address'),
  replay: {
    startAt: config => config.get('ethereum.contracts.nftfi.loanV1Fixed.replayBlock'),
    enabled: false
  },
  ABI
})
export class NftfiLoanV1FixedContract extends Contract {
  static Event = {
    LoanLiquidated: 'LoanLiquidated',
    LoanRepaid: 'LoanRepaid',
    LoanStarted: 'LoanStarted'
  };
}
