export const SECONDS_IN_A_DAY = 60 * 60 * 24;

export class NftfiLoanMath {
  static calculateApr(principal: string, repayment: string, duration: number): number {
    const bnPrincipal = BigInt(principal);
    const bnRepayment = BigInt(repayment);
    const interestPaid = Number(bnRepayment - bnPrincipal);
    const apr = (interestPaid / Number(bnPrincipal) / (duration / SECONDS_IN_A_DAY)) * 365 * 100;
    return this.formatApr(apr);
  }

  static calculateEffectiveApr(principal: string, repayment: string, duration: number, fee: string): number {
    const bnPrincipal = BigInt(principal);
    const bnRepayment = BigInt(repayment);
    const bnFee = BigInt(fee);
    const totalPaid = bnRepayment + bnFee;
    const interestPaid = Number(totalPaid - bnPrincipal);
    const apr = (interestPaid / Number(bnPrincipal) / (duration / SECONDS_IN_A_DAY)) * 365 * 100;
    return this.formatApr(apr);
  }

  static calculateFee(principal: string, feeBps: number): string {
    return String((BigInt(principal) * BigInt(feeBps)) / BigInt(10000));
  }

  private static formatApr(apr: number): number {
    return Number.isFinite(apr) ? Math.max(Number(apr.toFixed(5)), 0) : 0;
  }
}
