import { describe, it, expect } from 'vitest'
import { secondsToTimeRemaining } from 'src/utils/time'
import { Seconds } from 'src/entities/base/Seconds'

describe('time utils', () => {
  describe('secondsToTimeRemaining', () => {
    it('should return empty placeholder for undefined', () => {
      expect(secondsToTimeRemaining(undefined)).toEqual({
        timeRemaining: '-',
        timeUnits: 'common.time-units.empty',
      })
    })

    it('should return empty placeholder for null', () => {
      expect(secondsToTimeRemaining(null as unknown as Seconds)).toEqual({
        timeRemaining: '-',
        timeUnits: 'common.time-units.empty',
      })
    })

    it('should return empty placeholder for negative seconds', () => {
      expect(secondsToTimeRemaining((-1 as unknown) as Seconds)).toEqual({
        timeRemaining: '-',
        timeUnits: 'common.time-units.empty',
      })
    })

    it('should return days when at least 1 day', () => {
      expect(secondsToTimeRemaining((86_400 as unknown) as Seconds)).toEqual({
        timeRemaining: '1',
        timeUnits: 'common.time-units.day',
      })

      expect(secondsToTimeRemaining((2 * 86_400 as unknown) as Seconds)).toEqual({
        timeRemaining: '2',
        timeUnits: 'common.time-units.day-plural',
      })

      // Floors partial days
      expect(secondsToTimeRemaining((86_400 + 3_600 as unknown) as Seconds)).toEqual({
        timeRemaining: '1',
        timeUnits: 'common.time-units.day',
      })
    })

    it('should return hours when less than 1 day and at least 1 hour', () => {
      expect(secondsToTimeRemaining((3_600 as unknown) as Seconds)).toEqual({
        timeRemaining: '1',
        timeUnits: 'common.time-units.hr',
      })

      expect(secondsToTimeRemaining((2 * 3_600 as unknown) as Seconds)).toEqual({
        timeRemaining: '2',
        timeUnits: 'common.time-units.hr-plural',
      })

      // 23:59:59 should still show 23 hours
      expect(secondsToTimeRemaining((86_399 as unknown) as Seconds)).toEqual({
        timeRemaining: '23',
        timeUnits: 'common.time-units.hr-plural',
      })
    })

    it('should return minutes when less than 1 hour and at least 1 minute', () => {
      expect(secondsToTimeRemaining((60 as unknown) as Seconds)).toEqual({
        timeRemaining: '1',
        timeUnits: 'common.time-units.min',
      })

      expect(secondsToTimeRemaining((2 * 60 as unknown) as Seconds)).toEqual({
        timeRemaining: '2',
        timeUnits: 'common.time-units.min-plural',
      })

      // Floors partial minutes
      expect(secondsToTimeRemaining((3_599 as unknown) as Seconds)).toEqual({
        timeRemaining: '59',
        timeUnits: 'common.time-units.min-plural',
      })
    })

    it('should return seconds when less than 1 minute', () => {
      expect(secondsToTimeRemaining((0 as unknown) as Seconds)).toEqual({
        timeRemaining: '0',
        timeUnits: 'common.time-units.sec',
      })

      expect(secondsToTimeRemaining((59 as unknown) as Seconds)).toEqual({
        timeRemaining: '59',
        timeUnits: 'common.time-units.sec',
      })
    })
  })
})
