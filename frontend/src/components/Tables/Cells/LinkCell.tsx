import { memo } from 'react'
import { Button, Stack } from '@mui/material'
import { Link } from 'react-router-dom'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { useTableDensity } from 'src/components/Tables/useTableDensity'
import { TKey } from 'src/modules/translation/TKey'

export type LinkCellProps = {
  path: string
  icon?: React.ReactNode
  linkCopyTranslationKey?: TKey
  show?: boolean
  external?: boolean
}

export const LinkCell = memo(function LinkCell({
  path,
  linkCopyTranslationKey,
  show = true,
  external = false,
  icon,
}: LinkCellProps) {
  const density = useTableDensity()
  const height = density === 'compact'
    ? 30
    : 36
  const { t } = useTranslation()

  if (!show) {
    return null
  }

  if (icon) {
    return (
      <Stack
        component='a'
        href={path}
        justifyContent='center'
        height='100%'
        target='_blank'
        rel='noopener noreferrer'
        sx={{
          cursor: 'pointer',
          color: 'inherit',
        }}
      >
        {icon}
      </Stack>
    )
  }

  const buttonSx = {
    height,
    // Apply hover styles when row is hovered or selected
    '.MuiDataGrid-row:hover &, .MuiDataGrid-row.Mui-selected &': {
      backgroundColor: 'primary.main',
      color: 'grey.50',
    },
    // Add active state for click down feedback with higher specificity
    '&:active, .MuiDataGrid-row &:active': {
      backgroundColor: 'primary.dark',
      color: 'grey.50',
    },
  }

  return (
    <Stack
      height='100%'
      justifyContent='center'
      px='2'
      className='apply-sticky-right-cell'
    >
      {external
        ? (
          <Button
            variant='link'
            href={path}
            target='_blank'
            rel='noopener noreferrer'
            sx={buttonSx}
          >
            {linkCopyTranslationKey
              ? t(linkCopyTranslationKey)
              : null}
          </Button>
        )
        : (
          <Button variant='link' component={Link} to={path} sx={buttonSx}>
            {linkCopyTranslationKey
              ? t(linkCopyTranslationKey)
              : null}
          </Button>
        )}
    </Stack>
  )
})
