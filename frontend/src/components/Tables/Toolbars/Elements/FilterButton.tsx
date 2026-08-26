import { Button, ButtonProps } from '@mui/material'
import { memo } from 'react'
import { Iconify } from 'src/components/Iconify'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { getTestId } from 'src/utils/testing'

interface FilterButtonProps {
  onClick: ButtonProps['onClick']
}

export const FilterButton = memo(function FilterButton({ onClick }: FilterButtonProps) {
  const { t } = useTranslation()

  return (
    <Button
      variant='outlined'
      onClick={onClick}
      startIcon={<Iconify icon='ph:funnel-simple' />}
      sx={{
        minWidth: 'auto',
      }}
      {...getTestId('table.toolbar.filter')}
    >
      {t('filters.filter')}
    </Button>
  )
})
