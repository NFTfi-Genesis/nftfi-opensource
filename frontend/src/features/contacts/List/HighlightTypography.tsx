import React from 'react'
import { Typography, TypographyProps } from '@mui/material'
import { getTestId } from 'src/utils/testing'

interface HighlightTypographyProps extends TypographyProps {
  text: string
  highlights: number[][]
}

export function HighlightTypography({
  text,
  highlights,
  ...typographyProps
}: HighlightTypographyProps) {
  if (!highlights || highlights.length === 0) {
    return <Typography {...typographyProps}>{text}</Typography>
  }

  const sortedHighlights = [...highlights].sort((a, b) => a[0] - b[0])

  // Merge overlapping highlights (eg. highlight "vit" and "t" would produce "vittalik.eth" instead of "vitalik.eth")
  const mergedHighlights: number[][] = []
  for (const [start, end] of sortedHighlights) {
    if (mergedHighlights.length === 0) {
      mergedHighlights.push([start, end])
    } else {
      const lastHighlight = mergedHighlights[mergedHighlights.length - 1]
      const [, lastEnd] = lastHighlight

      // If current highlight overlaps or is adjacent to the last one, merge them
      if (start <= lastEnd + 1) {
        lastHighlight[1] = Math.max(lastEnd, end)
      } else {
        mergedHighlights.push([start, end])
      }
    }
  }

  const segments: React.ReactNode[] = []
  let lastIndex = 0

  mergedHighlights.forEach(([start, end], index) => {
    if (start > lastIndex) {
      segments.push(
        <Typography key={`text-${index}`} component='span' {...typographyProps}>
          {text.slice(lastIndex, start)}
        </Typography>
      )
    }

    segments.push(
      <Typography
        key={`highlight-${index}`}
        component='span'
        color='common.white'
        fontWeight='bold'
        {...typographyProps}
        {...getTestId('contacts.search.highlight')}
      >
        {text.slice(start, end + 1)}
      </Typography>
    )

    lastIndex = end + 1
  })

  if (lastIndex < text.length) {
    segments.push(
      <Typography key='text-end' component='span' {...typographyProps}>
        {text.slice(lastIndex)}
      </Typography>
    )
  }

  return (
    <Typography component='span' {...typographyProps} noWrap>
      {segments}
    </Typography>
  )
}
