import { Contract, ContractBuilder } from '@nftfi.api/modules/ethers-observer';
import ABI from './blur-loan.abi.json';

@ContractBuilder({
  address: config => config.get('ethereum.contracts.blur.loanV1.address'),
  replay: {
    startAt: config => config.get('ethereum.contracts.blur.loanV1.replayBlock'),
    enabled: false
  },
  ABI
})
export class BlurLoanContract extends Contract {
  static Event = {
    Created: 'LoanOfferTaken',
    Refinanced: 'Refinance',
    Repaid: 'Repay',
    Liquidated: 'Seize',
    StartAuction: 'StartAuction'
  };
}
