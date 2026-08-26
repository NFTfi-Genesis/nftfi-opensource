import { memo } from 'react'
import { Stack, Typography } from '@mui/material'

export type TextWithSubtextCellProps = {
  text: string
  subtext?: string
  monoFont?: boolean
}

export const TextWithSubtextCell = memo(function TextWithSubtextCell({
  text,
  subtext,
  monoFont = false,
}: TextWithSubtextCellProps) {
  return (
    <Stack height='100%' justifyContent='center'>
      <Typography variant={monoFont
        ? 'captionMono'
        : 'body2'} fontSize={14}>{text}</Typography>
      {subtext && <Typography
        variant={monoFont
          ? 'caption'
          : 'body2'}
        sx={{ color: theme => theme.palette.text.secondary }}
      >
        {subtext}
      </Typography>}
    </Stack>
  )
})
