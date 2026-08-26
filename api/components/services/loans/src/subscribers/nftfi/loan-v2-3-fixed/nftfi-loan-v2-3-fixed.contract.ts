import { Contract, ContractBuilder } from '@nftfi.api/modules/ethers-observer';
import ABI from './nftfi-loan-v2-3-fixed.abi.json';

@ContractBuilder({
  address: config => config.get('ethereum.contracts.nftfi.loanV23Fixed.address'),
  replay: {
    startAt: config => config.get('ethereum.contracts.nftfi.loanV23Fixed.replayBlock'),
    enabled: false
  },
  ABI
})
export class NftfiLoanV23FixedContract extends Contract {
  static Event = {
    LoanLiquidated: 'LoanLiquidated',
    LoanRenegotiated: 'LoanRenegotiated',
    LoanRepaid: 'LoanRepaid',
    LoanStarted: 'LoanStarted'
  };
}
