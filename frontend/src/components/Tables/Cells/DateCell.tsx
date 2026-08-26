import { memo } from 'react'
import { TKey } from 'src/modules/translation/TKey'
import { NumberWithSubtextCell } from './NumberWithSubtextCell'

export type DateCellProps = {
  date?: Date | null | string
  tooltip?: TKey
}

export const DateCell = memo(function DateCell({
  date,
  tooltip,
}: DateCellProps) {
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

  let datePart = '-'
  let timePart = ''

  if (dateObj && !isNaN(dateObj.getTime())) {
    datePart = dateObj.toLocaleDateString()
    timePart = dateObj.toLocaleTimeString()
  }

  return (
    <NumberWithSubtextCell
      number={datePart}
      subtext={timePart}
      tooltip={tooltip}
    />
  )
})
