import { ReactNode, memo, useCallback } from 'react'
import { Box, Stack, Button } from '@mui/material'
import { GridToolbarContainer } from '@mui/x-data-grid'
import { pxToRem } from 'src/modules/theme/typography'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { useDrawers } from 'src/modules/drawers/DrawersProvider'
import { DrawerType } from 'src/modules/drawers/DrawerType'
import { ActionsDrawer } from 'src/components/ActionsDrawer'
import { Iconify } from 'src/components/Iconify'
import { FilterButton } from './Elements/FilterButton'
import { DensitySelector } from './Elements/DensitySelector'
import { ColumnsSelector } from './Elements/ColumnsSelector'

interface DrawerFiltersToolbarProps {
  filtersForm: ReactNode
  filtersTags?: ReactNode
  showClear: boolean
  resetAllFilters: () => void
  additionalActions?: ReactNode
}

export const DrawerFiltersToolbar = memo(function DrawerFiltersToolbar({
  filtersForm,
  filtersTags,
  showClear,
  resetAllFilters,
  additionalActions,
}: DrawerFiltersToolbarProps) {
  const { t } = useTranslation()
  const { setDrawerOpen } = useDrawers()

  const handleOpenFilters = useCallback(() => {
    setDrawerOpen(DrawerType.DashboardFilters, true)
  }, [setDrawerOpen])

  return (
    <>
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 0 },
        }}
      >
        <GridToolbarContainer
          sx={{
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            width: '100%',
            minHeight: pxToRem(74),
            gap: { xs: 2, sm: 0 },
            position: 'static',
          }}
        >
          {/* Toolbar Buttons - Display First in Mobile */}
          <Stack
            direction='row'
            spacing={1}
            alignItems='center'
            sx={{
              width: { xs: '100%', sm: 'auto' },
              justifyContent: { xs: 'space-between', sm: 'flex-start' },
              order: { xs: 1, sm: 3 },
            }}
          >
            <ColumnsSelector />
            <DensitySelector />
            {additionalActions}
            <FilterButton onClick={handleOpenFilters} />
          </Stack>

          {/* Filter Chips - Display Second in Mobile */}
          {filtersTags && (
            <Box
              sx={{
                width: '100%',
                order: { xs: 2, sm: 1 },
                flex: { sm: 1 },
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                flexWrap: 'wrap',
              }}
            >
              {filtersTags}
              {showClear && (
                <Button variant='text' onClick={resetAllFilters} sx={{ whiteSpace: 'nowrap' }}>
                  <Iconify icon='ph:trash' mr={1} /> {t('filters.clear')}
                </Button>
              )}
            </Box>
          )}
        </GridToolbarContainer>
      </Box>

      <ActionsDrawer
        title={t('filters.filters')}
        drawerType={DrawerType.DashboardFilters}
        width='386px'
      >
        {filtersForm}
      </ActionsDrawer>
    </>
  )
})
