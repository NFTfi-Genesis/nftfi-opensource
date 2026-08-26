import { Contract, ContractBuilder } from '@nftfi.api/modules/ethers-observer';
import ABI from './arcade-loan-v3.abi.json';

@ContractBuilder({
  address: config => config.get('ethereum.contracts.arcade.loanV3.address'),
  replay: {
    startAt: config => config.get('ethereum.contracts.arcade.loanV3.replayBlock'),
    enabled: false
  },
  ABI
})
export class ArcadeLoanV3Contract extends Contract {
  static Event = {
    Created: 'LoanStarted',
    Refinanced: 'LoanRolledOver',
    Repaid: 'LoanRepaid',
    Liquidated: 'LoanClaimed'
  };
}
