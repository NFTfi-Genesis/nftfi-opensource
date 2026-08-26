import { NftfiLoanMath, SECONDS_IN_A_DAY } from '../src/subscribers/nftfi/nftfi-loan-math';

describe(NftfiLoanMath.name, () => {
  describe(NftfiLoanMath.calculateApr.name, () => {
    it('calculates apr for one-day loan', () => {
      const result = NftfiLoanMath.calculateApr('1000', '1100', SECONDS_IN_A_DAY);

      expect(result).toBe(3650);
    });

    it('returns 0 when repayment is less than principal', () => {
      const result = NftfiLoanMath.calculateApr('1000', '900', SECONDS_IN_A_DAY);

      expect(result).toBe(0);
    });

    it('returns 0 for non-finite apr (zero principal)', () => {
      const result = NftfiLoanMath.calculateApr('0', '1000', SECONDS_IN_A_DAY);

      expect(result).toBe(0);
    });
  });

  describe(NftfiLoanMath.calculateEffectiveApr.name, () => {
    it('includes fee in effective apr', () => {
      const result = NftfiLoanMath.calculateEffectiveApr('1000', '1100', SECONDS_IN_A_DAY, '50');

      expect(result).toBe(5475);
    });
  });

  describe(NftfiLoanMath.calculateFee.name, () => {
    it('calculates fee in basis points', () => {
      const result = NftfiLoanMath.calculateFee('100000', 250);

      expect(result).toBe('2500');
    });
  });
});
