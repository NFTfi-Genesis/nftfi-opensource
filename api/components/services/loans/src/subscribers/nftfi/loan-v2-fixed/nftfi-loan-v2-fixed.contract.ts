import { Contract, ContractBuilder } from '@nftfi.api/modules/ethers-observer';
import ABI from './nftfi-loan-v2-fixed.abi.json';

@ContractBuilder({
  address: config => config.get('ethereum.contracts.nftfi.loanV2Fixed.address'),
  replay: {
    startAt: config => config.get('ethereum.contracts.nftfi.loanV2Fixed.replayBlock'),
    enabled: false
  },
  ABI
})
export class NftfiLoanV2FixedContract extends Contract {
  static Event = {
    LoanLiquidated: 'LoanLiquidated',
    LoanRenegotiated: 'LoanRenegotiated',
    LoanRepaid: 'LoanRepaid',
    LoanStarted: 'LoanStarted'
  };
}
