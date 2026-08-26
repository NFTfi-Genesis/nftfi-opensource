import { Contract, ContractBuilder } from '@nftfi.api/modules/ethers-observer';
import ABI from './nftfi-loan-v3-refinance.abi.json';

@ContractBuilder({
  address: config => config.get('ethereum.contracts.nftfi.loanV3Refinance.address'),
  replay: {
    startAt: config => config.get('ethereum.contracts.nftfi.loanV3Refinance.replayBlock'),
    enabled: false
  },
  ABI
})
export class NftfiLoanV3RefinanceContract extends Contract {
  static Event = {
    Refinanced: 'Refinanced'
  };
}
