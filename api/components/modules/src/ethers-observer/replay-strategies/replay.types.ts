export interface BlockRange {
  start: number;
  end: number;
}

export enum ReplayEvent {
  Started = 'Started',
  Done = 'Done'
}
