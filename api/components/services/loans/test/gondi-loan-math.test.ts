import { GondiLoanMath } from '../src/subscribers/gondi/gondi-loan-math';

describe(GondiLoanMath.name, () => {
  describe(GondiLoanMath.calculateDuration.name, () => {
    it('returns remaining duration when emittedAt is within the loan period', () => {
      const startedAt = new Date('2025-01-01T00:00:00.000Z');
      const emittedAt = new Date('2025-01-01T00:10:00.000Z');

      const result = GondiLoanMath.calculateDuration(3600, emittedAt, startedAt);

      expect(result).toBe(3000);
    });

    it('returns original duration when emittedAt is after the loan period', () => {
      const startedAt = new Date('2025-01-01T00:00:00.000Z');
      const emittedAt = new Date('2025-01-01T02:00:00.000Z');

      const result = GondiLoanMath.calculateDuration(3600, emittedAt, startedAt);

      expect(result).toBe(3600);
    });
  });
});
