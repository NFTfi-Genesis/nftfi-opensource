import { memo } from 'react'
import { formatDistanceToNowStrict } from 'date-fns'
import { TKey } from 'src/modules/translation/TKey'
import { NumberWithSubtextCell } from './NumberWithSubtextCell'

export type RelativeAndFormattedDateCellProps = {
  date?: Date | null | string
  tooltip?: TKey
}

export const RelativeAndFormattedDateCell = memo(function RelativeAndFormattedDateCell({
  date,
  tooltip,
}: RelativeAndFormattedDateCellProps) {
  if (!date) {
    return <NumberWithSubtextCell number='-' subtext='' tooltip={tooltip} />
  }

  let dateObj: Date | null = null

  if (typeof date === 'string' || date instanceof String) {
    dateObj = new Date(date as string)
  }
  if (date instanceof Date) {
    dateObj = date
  }

  if (!dateObj || isNaN(dateObj.getTime())) {
    return <NumberWithSubtextCell number='-' subtext='' tooltip={tooltip} />
  }

  const relativeTimeDisplay = `${formatDistanceToNowStrict(dateObj)} ago`
  const dateDisplay = dateObj.toLocaleDateString()

  return (
    <NumberWithSubtextCell
      number={relativeTimeDisplay}
      subtext={dateDisplay}
      tooltip={tooltip}
    />
  )
})
