import { BigNumber, FixedNumber } from 'ethers';
import { MarketLoan } from '@nftfi.api/repositories/postgres/market-loan';
import { SECONDS_PER_YEAR } from './constants';

export class LoanMath {
  static calculateInterest(principal: string, repayment: string): string {
    const repaymentBN = BigNumber.from(repayment);
    const principalBN = BigNumber.from(principal);
    const interest = repaymentBN.sub(principalBN);

    return interest.isNegative() ? '0' : interest.toString();
  }

  static calculateApr(loan: Pick<MarketLoan, 'principal' | 'repayment' | 'originationFee' | 'duration'>): number {
    const principalBN = BigNumber.from(loan.principal);
    const repaymentBN = BigNumber.from(loan.repayment);
    const feeBN = BigNumber.from(loan.originationFee);

    const totalPaid = repaymentBN.add(feeBN);
    const interest = totalPaid.sub(principalBN);

    if (interest.lte(0) || loan.duration <= 0) return 0;

    const principalDec = FixedNumber.fromValue(principalBN, 18);
    const interestDec = FixedNumber.fromValue(interest, 18);

    const rate = interestDec.divUnsafe(principalDec).divUnsafe(FixedNumber.from(loan.duration));
    const apr = rate.mulUnsafe(FixedNumber.from(SECONDS_PER_YEAR)).mulUnsafe(FixedNumber.fromString('100'));

    const result = parseFloat(apr.round(4).toString());
    return Number.isFinite(result) ? Math.max(result, 0) : 0;
  }
}
