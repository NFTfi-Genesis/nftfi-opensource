import { Days } from 'src/entities/base/Days'
import { ISOStringDate } from 'src/entities/base/ISOStringDate'
import { Seconds } from 'src/entities/base/Seconds'
import { TKey } from 'src/modules/translation/TKey'

export function parseISODateUTC(isoDate: ISOStringDate): Date {
  return new Date(isoDate + 'Z')
}

export function secondsToDays(seconds: Seconds): Days {
  return Math.floor(seconds / 86400) as Days
}

export function secondsToTimeRemaining(totalSeconds?: Seconds): {
  timeRemaining: string
  timeUnits: TKey
} {
  if (totalSeconds === undefined || totalSeconds === null) {
    return { timeRemaining: '-', timeUnits: 'common.time-units.empty' }
  }
  if (totalSeconds < 0) {
    return { timeRemaining: '-', timeUnits: 'common.time-units.empty' }
  }

  const days = Math.floor(totalSeconds / (3600 * 24))
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (days > 0) {
    return {
      timeRemaining: String(days),
      timeUnits: days > 1
        ? 'common.time-units.day-plural'
        : 'common.time-units.day',
    }
  }
  if (hours > 0) {
    return {
      timeRemaining: String(hours),
      timeUnits: hours > 1
        ? 'common.time-units.hr-plural'
        : 'common.time-units.hr',
    }
  }
  if (minutes > 0) {
    return {
      timeRemaining: String(minutes),
      timeUnits: minutes > 1
        ? 'common.time-units.min-plural'
        : 'common.time-units.min',
    }
  }
  return { timeRemaining: String(totalSeconds), timeUnits: 'common.time-units.sec' }
}
