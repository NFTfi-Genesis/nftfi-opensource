import { Contract, ContractBuilder } from '@nftfi.api/modules/ethers-observer';
import ABI from './nftfi-loan-v23-refinance.abi.json';

@ContractBuilder({
  address: config => config.get('ethereum.contracts.nftfi.loanV23Refinance.address'),
  replay: {
    startAt: config => config.get('ethereum.contracts.nftfi.loanV23Refinance.replayBlock'),
    enabled: false
  },
  ABI
})
export class NftfiLoanV23RefinanceContract extends Contract {
  static Event = {
    Refinanced: 'Refinanced'
  };
}
