import { Box, Stack, StackProps, alpha, useTheme } from '@mui/material'
import { memo } from 'react'
import { pxToRem } from 'src/modules/theme/typography'

type TagsGroupProps = StackProps & {
  label: string
  noWrap?: boolean
}

export const TagsGroup = memo(function TagsGroup({ label, children, sx, noWrap, ...other }: TagsGroupProps) {
  const theme = useTheme()
  return (
    <Stack
      spacing={1}
      direction='row'
      sx={{
        p: pxToRem(7),
        borderRadius: 1,
        overflow: 'hidden',
        textWrap: 'nowrap',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: alpha(theme.palette.grey[500], 0.16),
        ...sx,
      }}
      {...other}
    >
      <Box component='span' sx={{ typography: 'subtitle2' }}>
        {label}
      </Box>

      <Stack spacing={1} direction='row' flexWrap={noWrap
        ? 'nowrap'
        : 'wrap'}>
        {children}
      </Stack>
    </Stack>
  )
})
