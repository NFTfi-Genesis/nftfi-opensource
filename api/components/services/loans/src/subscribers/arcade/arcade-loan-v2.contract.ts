import { Contract, ContractBuilder } from '@nftfi.api/modules/ethers-observer';
import ABI from './arcade-loan-v2.abi.json';

@ContractBuilder({
  address: config => config.get('ethereum.contracts.arcade.loanV2.address'),
  replay: {
    startAt: config => config.get('ethereum.contracts.arcade.loanV2.replayBlock'),
    enabled: false
  },
  ABI
})
export class ArcadeLoanV2Contract extends Contract {
  static Event = {
    Created: 'LoanStarted',
    Refinanced: 'LoanRolledOver',
    Repaid: 'LoanRepaid',
    Liquidated: 'LoanClaimed'
  };
}
