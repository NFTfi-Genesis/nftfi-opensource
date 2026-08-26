import { memo } from 'react'
import { formatDistanceToNowStrict } from 'date-fns'
import { TKey } from 'src/modules/translation/TKey'
import { NumberWithSubtextCell } from './NumberWithSubtextCell'

export type RelativeDateCellProps = {
  date?: Date
  tooltip?: TKey
}

export const RelativeDateCell = memo(function RelativeDateCell({
  date,
  tooltip,
}: RelativeDateCellProps) {
  if (!date) {
    return <NumberWithSubtextCell number='-' subtext='' tooltip={tooltip} />
  }

  const distance = date
    ? formatDistanceToNowStrict(date)
    : '-'
  const words = distance.split(' ')

  return (
    <NumberWithSubtextCell
      number={words[0]}
      subtext={words[1]}
      tooltip={tooltip}
    />
  )
})
