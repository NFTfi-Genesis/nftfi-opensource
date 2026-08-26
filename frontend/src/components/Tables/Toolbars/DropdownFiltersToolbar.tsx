import { ReactNode, useState, MouseEvent, memo } from 'react'
import { Box, Stack, Popover, Button, useTheme } from '@mui/material'
import { GridToolbarContainer } from '@mui/x-data-grid'
import { pxToRem } from 'src/modules/theme/typography'
import { useBreakpoints } from 'src/modules/theme/useBreakpoints'
import { Iconify } from 'src/components/Iconify'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { ActionsDrawer } from 'src/components/ActionsDrawer'
import { DrawerType } from 'src/modules/drawers/DrawerType'
import { useDrawers } from 'src/modules/drawers/DrawersProvider'
import { getTestId } from 'src/utils/testing'
import { FilterButton } from './Elements/FilterButton'
import { DensitySelector } from './Elements/DensitySelector'
import { ColumnsSelector } from './Elements/ColumnsSelector'

interface DropdownFiltersToolbarProps {
  filtersForm: ReactNode
  filtersTags: ReactNode
  showClear: boolean
  resetAllFilters: () => void
  drawerType: DrawerType
  drawerTitle: string
  filtersDropdownWidth?: number
  additionalActions?: ReactNode
  inlineFiltersTags?: boolean
}

export const DropdownFiltersToolbar = memo(function DropdownFiltersToolbar({
  filtersForm,
  filtersTags,
  showClear,
  resetAllFilters,
  drawerType,
  drawerTitle,
  filtersDropdownWidth = 303,
  additionalActions,
  inlineFiltersTags = true,
}: DropdownFiltersToolbarProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const { isMobileView } = useBreakpoints()
  const { t } = useTranslation()
  const theme = useTheme()
  const { setDrawerOpen } = useDrawers()

  const handleOpenFilters = (event: MouseEvent<HTMLElement>) =>{
    if (isMobileView) {
      // Open drawer for mobile
      setDrawerOpen(drawerType, true)
    } else {
      // Open popover for desktop
      setAnchorEl(event.currentTarget)
    }
  }

  const handleCloseFilters = () =>{
    if (isMobileView) {
      // Close drawer for mobile
      setDrawerOpen(drawerType, false)
    } else {
      // Close popover for desktop
      setAnchorEl(null)
    }
  }

  const open = Boolean(anchorEl)

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
            padding: '0px 16px',
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
                position: 'relative',
                paddingTop: '6px',
                overflow: 'hidden',
                alignItems: 'center',
                alignSelf: 'stretch',
              }}
            >
              {/* Scrollable container for filter tags - uses global scrollbar styling */}
              <Box
                sx={{
                  flex: 1,
                  overflowX: 'scroll',
                  overflowY: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: 0,
                }}
              >
                <Stack
                  direction='row'
                  spacing={1}
                  alignItems='center'
                  flexWrap={inlineFiltersTags
                    ? 'nowrap'
                    : 'wrap'}
                  sx={{
                    minWidth: 'fit-content',
                    pr: showClear
                      ? 2
                      : 0,
                  }}
                >
                  {filtersTags}
                  {!inlineFiltersTags && showClear
                    && <Button variant='text' onClick={resetAllFilters} sx={{ whiteSpace: 'nowrap' }} {...getTestId('table.toolbar.clear')}>
                      <Iconify icon='ph:trash' mr={1} /> {t('filters.clear')}
                    </Button>
                  }
                </Stack>
              </Box>

              {/* Sticky clear button */}
              {showClear && inlineFiltersTags && (
                <Box
                  sx={{
                    paddingBottom: '6px',
                    position: inlineFiltersTags
                      ? 'sticky'
                      : 'relative',
                    right: 0,
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: theme.palette.customPallette.nftfi.paper,
                    zIndex: 1,
                    pl: 2,
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: '-24px',
                      width: '24px',
                      height: '100%',
                      background: `linear-gradient(to right, transparent, ${theme.palette.customPallette.nftfi.paper})`,
                      pointerEvents: 'none',
                    },
                  }}
                >
                  <Button variant='text' onClick={resetAllFilters} sx={{ whiteSpace: 'nowrap' }} {...getTestId('table.toolbar.clear')}>
                    <Iconify icon='ph:trash' mr={1} /> {t('filters.clear')}
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </GridToolbarContainer>
      </Box>

      {isMobileView
        ? (
          <ActionsDrawer title={drawerTitle} drawerType={drawerType} width='386px'>
            {filtersForm}
          </ActionsDrawer>
        )
        : (
          <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={handleCloseFilters}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            slotProps={{
              paper: {
                sx: theme => ({
                  backgroundColor: theme.palette.background.tooltip,
                  borderRadius: 2,
                  boxShadow: theme.customShadows.dropdown,
                  padding: 2.5,
                  width: filtersDropdownWidth,
                  marginTop: '10px',
                }),
              },
            }}
          >
            {filtersForm}
          </Popover>
        )}
    </>
  )
})
