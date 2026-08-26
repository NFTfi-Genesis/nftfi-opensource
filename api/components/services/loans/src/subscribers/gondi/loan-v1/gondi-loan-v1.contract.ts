import { ContractBuilder } from '@nftfi.api/modules/ethers-observer';
import { GondiLoanContract } from '../gondi-loan.contract';
import ABI from './gondi-loan-v1.abi.json';

@ContractBuilder({
  address: config => config.get('ethereum.contracts.gondi.loanV1.address'),
  replay: {
    startAt: config => config.get('ethereum.contracts.gondi.loanV1.replayBlock'),
    enabled: false
  },
  ABI
})
export class GondiLoanV1Contract extends GondiLoanContract {
  static Event = {
    Started: 'LoanEmitted',
    Refinanced: 'LoanRefinanced',
    Repaid: 'LoanRepaid',
    Liquidated: 'LoanLiquidated',
    Foreclosed: 'LoanForeclosed'
  };
}
