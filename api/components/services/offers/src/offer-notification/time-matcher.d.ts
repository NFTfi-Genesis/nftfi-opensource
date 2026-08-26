declare module 'node-cron/src/time-matcher' {
  export default class TimeMatcher {
    constructor(cronSchedule: string);
    match(date: Date): boolean;
  }
}
