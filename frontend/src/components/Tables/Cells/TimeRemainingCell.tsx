import { memo } from 'react'
import { Seconds } from 'src/entities/base/Seconds'
import { TKey } from 'src/modules/translation/TKey'
import { secondsToTimeRemaining } from 'src/utils/time'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { NumberWithSubtextCell } from './NumberWithSubtextCell'

export type TimeRemainingCellProps = {
  timeRemainingSeconds?: Seconds
  tooltip?: TKey
}

export const TimeRemainingCell = memo(function TimeRemainingCell({
  timeRemainingSeconds,
  tooltip,
}: TimeRemainingCellProps) {
  const { t } = useTranslation()

  if (!timeRemainingSeconds) {
    return <NumberWithSubtextCell number='-' subtext='' tooltip={tooltip} />
  }

  const { timeRemaining, timeUnits }
    = secondsToTimeRemaining(timeRemainingSeconds)

  return (
    <NumberWithSubtextCell
      number={timeRemaining}
      subtext={t(timeUnits)}
      tooltip={tooltip}
    />
  )
})
