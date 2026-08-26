import { CommsFrequency } from '@nftfi.api/repositories/postgres/account/account.types';
import * as utils from '../src/utils/cron';
import { isCommsFrequencyMatchesNow } from '../src/utils/cron';

describe('Cron', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  describe(utils.isCronMatches.name, () => {
    it('should return true if the cron matches', () => {
      const result = utils.isCronMatches();
      expect(result).toBe(true);
    });
  });

  describe(utils.isCommsFrequencyMatchesNow.name, () => {
    it('should return false if frequency is never', () => {
      expect(isCommsFrequencyMatchesNow(CommsFrequency.Never)).toBe(false);
    });

    it('should return true if frequency is daily and cron matches', () => {
      jest.spyOn(utils, 'isCronMatches').mockReturnValue(true);
      expect(isCommsFrequencyMatchesNow(CommsFrequency.Daily)).toBe(true);
    });

    it('should return false if frequency is daily and cron does not match', () => {
      jest.spyOn(utils, 'isCronMatches').mockReturnValue(false);
      expect(isCommsFrequencyMatchesNow(CommsFrequency.Daily)).toBe(false);
    });

    it('should return true if frequency is weekly and cron matches', () => {
      jest.spyOn(utils, 'isCronMatches').mockReturnValue(true);
      expect(isCommsFrequencyMatchesNow(CommsFrequency.Weekly)).toBe(true);
    });

    it('should return false if frequency is weekly and cron does not match', () => {
      jest.spyOn(utils, 'isCronMatches').mockReturnValue(false);
      expect(isCommsFrequencyMatchesNow(CommsFrequency.Weekly)).toBe(false);
    });
  });
});
