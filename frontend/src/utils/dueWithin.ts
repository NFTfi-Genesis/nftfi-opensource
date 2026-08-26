// TODO: Refactor to use Days everywhere
export enum DueWithin {
  SevenDays = 7,
  ThirtyDays = 30,
  NinetyDays = 90,
  OneEightyDays = 180,
  ThreeSixtyFiveDays = 365,
}

export const DueWithinLabels: Record<DueWithin, string> = {
  [DueWithin.SevenDays]: '7 days',
  [DueWithin.ThirtyDays]: '30 days',
  [DueWithin.NinetyDays]: '90 days',
  [DueWithin.OneEightyDays]: '180 days',
  [DueWithin.ThreeSixtyFiveDays]: '365 days',
}
