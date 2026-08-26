import { Contract, ContractBuilder } from '@nftfi.api/modules/ethers-observer';
import ABI from './nftfi-loan-v3-asset.abi.json';

@ContractBuilder({
  address: config => config.get('ethereum.contracts.nftfi.loanV3Asset.address'),
  replay: {
    startAt: config => config.get('ethereum.contracts.nftfi.loanV3Asset.replayBlock'),
    enabled: false
  },
  ABI
})
export class NftfiLoanV3AssetContract extends Contract {
  static Event = {
    LoanLiquidated: 'LoanLiquidated',
    LoanRenegotiated: 'LoanRenegotiated',
    LoanRepaid: 'LoanRepaid',
    LoanStarted: 'LoanStarted'
  };
}
