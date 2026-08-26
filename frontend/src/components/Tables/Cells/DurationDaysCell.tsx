import { memo } from 'react'
import {
  addDays,
  addSeconds,
  FormatDistanceStrictUnit,
  formatDistanceToNowStrict,
} from 'date-fns'
import { TKey } from 'src/modules/translation/TKey'
import { NumberWithSubtextCell } from './NumberWithSubtextCell'

export type DurationDaysCellProps = {
  amount?: number | null
  unit?: FormatDistanceStrictUnit
  tooltip?: TKey
}

export const DurationDaysCell = memo(function DurationDaysCell({
  amount,
  unit = 'day',
  tooltip,
}: DurationDaysCellProps) {
  if (!amount) {
    return <NumberWithSubtextCell number='-' subtext='' tooltip={tooltip} />
  }

  let words = ['-', 'days']
  if (amount) {
    let date = addDays(new Date(), amount)
    if (unit === 'second') {
      date = addSeconds(new Date(), amount)
    }
    const distance = formatDistanceToNowStrict(date, { unit: 'day' })
    words = distance.split(' ')
  }

  return (
    <NumberWithSubtextCell
      number={words[0]}
      subtext={words[1]}
      tooltip={tooltip}
    />
  )
})
