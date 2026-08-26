import { LoanMath } from '../src/subscribers/loan-math';

describe(LoanMath.name, () => {
  describe(LoanMath.calculateInterest.name, () => {
    it('returns repayment minus principal when positive', () => {
      const result = LoanMath.calculateInterest('100', '130');

      expect(result).toBe('30');
    });

    it('returns zero when repayment is below principal', () => {
      const result = LoanMath.calculateInterest('130', '100');

      expect(result).toBe('0');
    });
  });

  describe(LoanMath.calculateApr.name, () => {
    it('returns positive apr for valid loan inputs', () => {
      const result = LoanMath.calculateApr({
        principal: '1000000000000000000',
        repayment: '1100000000000000000',
        originationFee: '0',
        duration: 31536000
      });

      expect(result).toBeGreaterThan(0);
    });

    it('returns zero when computed interest is not positive', () => {
      const result = LoanMath.calculateApr({
        principal: '1000',
        repayment: '1000',
        originationFee: '0',
        duration: 1000
      });

      expect(result).toBe(0);
    });

    it('returns zero when duration is non-positive', () => {
      const result = LoanMath.calculateApr({
        principal: '1000',
        repayment: '1200',
        originationFee: '0',
        duration: 0
      });

      expect(result).toBe(0);
    });

    it('returns zero when parsed apr is not finite', () => {
      const parseFloatSpy = jest.spyOn(global, 'parseFloat').mockReturnValueOnce(Number.NaN);

      const result = LoanMath.calculateApr({
        principal: '1000000000000000000',
        repayment: '1100000000000000000',
        originationFee: '0',
        duration: 31536000
      });

      expect(result).toBe(0);
      parseFloatSpy.mockRestore();
    });
  });
});
