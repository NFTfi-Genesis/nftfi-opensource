import { Contract, ContractBuilder } from '@nftfi.api/modules/ethers-observer';
import ABI from './nftfi-loan-v31-refinance.abi.json';

@ContractBuilder({
  address: config => config.get('ethereum.contracts.nftfi.loanV31Refinance.address'),
  replay: {
    startAt: config => config.get('ethereum.contracts.nftfi.loanV31Refinance.replayBlock'),
    enabled: false
  },
  ABI
})
export class NftfiLoanV31RefinanceContract extends Contract {
  static Event = {
    Refinanced: 'Refinanced'
  };
}
