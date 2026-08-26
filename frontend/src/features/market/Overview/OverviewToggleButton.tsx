import { IconButton, useTheme } from '@mui/material'
import { memo } from 'react'
import { Iconify } from 'src/components/Iconify'
import { LocalStorageKeys } from 'src/modules/localStorage/config'
import { useLocalStorage } from 'src/modules/localStorage/useLocalStorage'

export const OverviewToggleButton = memo(function OverviewToggleButton() {
  const theme = useTheme()
  const [showOverview, setShowOverview] = useLocalStorage(LocalStorageKeys.DashboardUserPreferences.ShowOverview)

  return (
    <IconButton
      onClick={() => setShowOverview(!showOverview)}
      sx={{
        background: showOverview
          ? theme.palette.customPallette.nftfi.paperRecess
          : 'none',
        boxshadow: showOverview
          ? '0px 3px 3px 0px rgba(0, 0, 0, 0.25) inset'
          : 'none',
        borderRadius: '8px',
      }}
    >
      <Iconify icon='ph:speedometer' />
    </IconButton>
  )
})
