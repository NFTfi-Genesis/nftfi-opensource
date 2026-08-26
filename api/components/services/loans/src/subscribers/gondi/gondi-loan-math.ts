import { BigNumber } from 'ethers';
import { differenceInSeconds } from 'date-fns';
import { MarketLoan } from '@nftfi.api/repositories/postgres/market-loan';
import { SECONDS_PER_YEAR } from '../constants';
import { LoanPayload, LoanSource } from './gondi-loan.types';

export class GondiLoanMath {
  static calculateRepayment(evt: Pick<LoanPayload, 'duration' | 'sources' | 'feeAmount'>): string {
    const repayment = evt.sources.reduce((acc, s) => {
      const principal = BigNumber.from(s.principalAmount);
      const interest = principal
        .mul(s.aprBps)
        .mul(evt.duration)
        .div(SECONDS_PER_YEAR * 10000);

      const accruedInterest = BigNumber.from(s.accruedInterest);

      const repayment = principal.add(accruedInterest).add(interest);
      return acc.add(repayment);
    }, BigNumber.from(0));
    const fee = BigNumber.from(evt.feeAmount);

    return repayment.add(fee).toString();
  }

  static calculateRefiRepayment(
    oldLoan: Pick<MarketLoan, 'startedAt' | 'principal' | 'interest'>,
    emittedAt: Date
  ): string {
    const duration = differenceInSeconds(emittedAt, oldLoan.startedAt);
    const principal = BigNumber.from(oldLoan.principal);
    const interest = BigNumber.from(oldLoan.interest).div(SECONDS_PER_YEAR).mul(duration);
    const repayment = interest.add(principal).toString();
    return repayment;
  }

  static calculateDuration(duration: number, emittedAt: Date, startedAt: Date): number {
    const durationInSeconds = duration - (emittedAt.getTime() - startedAt.getTime()) / 1000;
    return durationInSeconds < 0 ? duration : durationInSeconds;
  }

  static calculateApr(tranche: LoanSource): number {
    return Number(tranche.aprBps) / 100;
  }
}
