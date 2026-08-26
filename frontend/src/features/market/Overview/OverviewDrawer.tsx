import { Box, IconButton, Stack, Typography, SwipeableDrawer } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { Scrollbar } from 'src/components/Scrollbar/Scrollbar'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { Iconify } from 'src/components/Iconify'
import { Overview } from './Overview'

export function OverviewDrawer({ showOverview, setShowOverview }: { showOverview: boolean, setShowOverview: (show: boolean) => void }) {
  const { t } = useTranslation()
  const theme = useTheme()

  return (
    <SwipeableDrawer
      anchor='right'
      open={showOverview}
      onClose={() => setShowOverview(false)}
      onOpen={() => setShowOverview(true)}
      disableBackdropTransition
      disableDiscovery
      swipeAreaWidth={0}
      transitionDuration={{
        enter: 300,
        exit: 300,
      }}
      sx={{
        '& .MuiDrawer-paper': {
          width: '320px',
          backgroundColor: theme.palette.customPallette.nftfi.paper,
          borderRight: `1px dashed ${theme.palette.divider}`,
        },
      }}
    >
      <Box
        display='flex'
        flexDirection='column'
        paddingY={2}
        paddingX={2.5}
        paddingRight={0.6}
        gap={2}
        height='100%'
      >
        <Stack
          direction='row'
          justifyContent='space-between'
          alignItems='center'
        >
          <Typography variant='h3'>{t('dashboard.Overview')}</Typography>
          <IconButton onClick={() => setShowOverview(false)}>
            <Iconify icon='ph:x' />
          </IconButton>
        </Stack>
        <Scrollbar sx={{ paddingRight: '14px' }}>
          <Overview />
        </Scrollbar>
      </Box>
    </SwipeableDrawer>
  )
}
