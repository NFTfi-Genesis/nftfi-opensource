import { ContractBuilder } from '@nftfi.api/modules/ethers-observer';
import { GondiLoanContract } from '../gondi-loan.contract';
import ABI from './gondi-loan-v3.abi.json';

@ContractBuilder({
  address: config => config.get('ethereum.contracts.gondi.loanV3.address'),
  replay: {
    startAt: config => config.get('ethereum.contracts.gondi.loanV3.replayBlock'),
    enabled: false
  },
  ABI
})
export class GondiLoanV3Contract extends GondiLoanContract {
  static Event = {
    Started: 'LoanEmitted',
    Refinanced: 'LoanRefinanced',
    RefinancedNewOffer: 'LoanRefinancedFromNewOffers',
    Repaid: 'LoanRepaid',
    Foreclosed: 'LoanForeclosed',
    Liquidated: 'LoanLiquidated'
  };
}
