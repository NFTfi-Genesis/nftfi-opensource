import useId from '@mui/utils/useId'
import { GridPreferencePanelsValue, useGridRootProps, useGridApiContext, useGridSelector, gridPreferencePanelStateSelector } from '@mui/x-data-grid'
import { IconButton } from '@mui/material'
import { Iconify } from 'src/components/Iconify'

export function ColumnsSelector() {
  const columnButtonId = useId()
  const columnPanelId = useId()

  const apiRef = useGridApiContext()
  const rootProps = useGridRootProps()
  const preferencePanel = useGridSelector(
    apiRef,
    gridPreferencePanelStateSelector
  )

  const showColumns = () => {
    if (
      preferencePanel.open
      && preferencePanel.openedPanelValue === GridPreferencePanelsValue.columns
    ) {
      apiRef.current.hidePreferences()
    } else {
      apiRef.current.showPreferences(
        GridPreferencePanelsValue.columns,
        columnPanelId,
        columnButtonId
      )
    }
  }

  if (rootProps.disableColumnSelector) {
    return null
  }

  const isOpen
    = preferencePanel.open && preferencePanel.panelId === columnPanelId

  return (
    <rootProps.slots.baseTooltip
      title={apiRef.current.getLocaleText('toolbarColumnsLabel')}
      enterDelay={1000}
      {...rootProps.slotProps?.baseTooltip}
    >
      <IconButton
        id={columnButtonId}
        size='small'
        aria-label={apiRef.current.getLocaleText('toolbarColumnsLabel')}
        aria-haspopup='menu'
        aria-expanded={isOpen}
        aria-controls={isOpen
          ? columnPanelId
          : undefined}
        {...rootProps.slotProps?.baseButton}
        onPointerUp={event => {
          if (preferencePanel.open) {
            event.stopPropagation()
          }
        }}
        onClick={showColumns}
      >
        <Iconify icon='ph:square-split-horizontal' />
      </IconButton>
    </rootProps.slots.baseTooltip>
  )
}
