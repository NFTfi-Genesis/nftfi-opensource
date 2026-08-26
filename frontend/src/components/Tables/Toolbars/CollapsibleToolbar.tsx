import { Box, Stack, Typography } from '@mui/material'
import { GridToolbarContainer } from '@mui/x-data-grid'
import { pxToRem } from 'src/modules/theme/typography'
import { Iconify } from 'src/components/Iconify'
import { ColumnsSelector } from './Elements/ColumnsSelector'
import { DensitySelector } from './Elements/DensitySelector'

export type CollapsibleToolbarProps = {
  title?: string
  onCollapse: () => void
  isCollapsed: boolean
}

export function CollapsibleToolbar({
  title,
  onCollapse,
  isCollapsed,
}: CollapsibleToolbarProps) {
  return (
    <>
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 0 },
          justifyContent: 'space-between',
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
          {title && <Typography variant='h5' padding={2}>
            {title}
          </Typography>}
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
            <Iconify
              icon={isCollapsed
                ? 'ph:caret-up'
                : 'ph:caret-down'}
              onClick={onCollapse}
              sx={{ cursor: 'pointer' }}
              width={24}
            />
          </Stack>
        </GridToolbarContainer>
      </Box>
    </>
  )
}
