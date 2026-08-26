import TimeMatcher from 'node-cron/src/time-matcher';
import { CronExpression } from '@nestjs/schedule';
import { CommsFrequency } from '@nftfi.api/repositories/postgres/account';

export const isCronMatches = (cronSchedule = CronExpression.EVERY_DAY_AT_MIDNIGHT): boolean => {
  const matcher = new TimeMatcher(cronSchedule);
  return matcher.match(new Date());
};

export const isCommsFrequencyMatchesNow = (frequency: CommsFrequency): boolean => {
  if (frequency === CommsFrequency.Never) {
    return false;
  }

  if (frequency === CommsFrequency.Daily) {
    return isCronMatches(CronExpression.EVERY_DAY_AT_MIDNIGHT);
  }

  if (frequency === CommsFrequency.Weekly) {
    return isCronMatches(CronExpression.EVERY_WEEK);
  }
  return false;
};
