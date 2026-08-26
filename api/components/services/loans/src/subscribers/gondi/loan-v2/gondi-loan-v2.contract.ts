import { ContractBuilder } from '@nftfi.api/modules/ethers-observer';
import { GondiLoanContract } from '../gondi-loan.contract';
import ABI from './gondi-loan-v2.abi.json';

@ContractBuilder({
  address: config => config.get('ethereum.contracts.gondi.loanV2.address'),
  replay: {
    startAt: config => config.get('ethereum.contracts.gondi.loanV2.replayBlock'),
    enabled: false
  },
  ABI
})
export class GondiLoanV2Contract extends GondiLoanContract {
  static Event = {
    Started: 'LoanEmitted',
    Refinanced: 'LoanRefinanced',
    Repaid: 'LoanRepaid',
    Foreclosed: 'LoanForeclosed',
    Liquidated: 'LoanLiquidated'
  };
}
