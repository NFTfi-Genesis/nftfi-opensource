import { ContractBuilder } from '@nftfi.api/modules/ethers-observer';
import { GondiLoanContract } from '../gondi-loan.contract';
import ABI from './gondi-loan-v31.abi.json';

@ContractBuilder({
  address: config => config.get('ethereum.contracts.gondi.loanV31.address'),
  replay: {
    startAt: config => config.get('ethereum.contracts.gondi.loanV31.replayBlock'),
    enabled: false
  },
  ABI
})
export class GondiLoanV31Contract extends GondiLoanContract {
  static Event = {
    Started: 'LoanEmitted',
    Refinanced: 'LoanRefinanced',
    RefinancedNewOffer: 'LoanRefinancedFromNewOffers',
    Repaid: 'LoanRepaid',
    Foreclosed: 'LoanForeclosed',
    Liquidated: 'LoanLiquidated'
  };
}
