import { Dialog, DialogTitle, Box, Stack, SxProps, Theme, Paper, PaperProps } from '@mui/material'
import { ReactNode, useRef } from 'react'
import Draggable from 'react-draggable'
import { useModals } from 'src/modules/modals/useModals'
import { Modals } from 'src/modules/modals/Modals'
import { getTestId } from 'src/utils/testing'
import { Iconify } from '../Iconify'

function PaperComponent(props: PaperProps) {
  const nodeRef = useRef(null)
  return (
    <Draggable
      nodeRef={nodeRef}
      handle='#draggable-dialog-title'
      cancel={'[class*="MuiDialogContent-root"]'}
    >
      <Paper {...props} ref={nodeRef} />
    </Draggable>
  )
}

export const Modal = function Modal(
  { modal, children, title, sx, draggable = false }: {
    modal: Modals
    children: React.ReactNode
    title: ReactNode
    sx?: SxProps<Theme>
    draggable?: boolean
  },
) {
  const modalResult = useModals<Modals>(modal)
  const { isOpen, close } = modalResult

  return (
    <Dialog
      open={isOpen}
      onClose={close}
      hideBackdrop // Hide individual backdrop since we use a persistent one
      sx={sx}
      PaperComponent={draggable
        ? PaperComponent
        : undefined}
      {...getTestId(`modal.${modal}`)}
    >
      <Stack bgcolor='customPallette.nftfi.paper' borderRadius={2} p={3}>
        <DialogTitle
          id={draggable ? 'draggable-dialog-title' : undefined}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pb: 2,
            gap: 2,
            cursor: draggable ? 'move' : 'default',
          }}
        >
          <Box display='flex' alignItems='center' gap={2}>
            {title}
          </Box>
          <Iconify {...getTestId(`modal.close`)} width={24} icon='mingcute:close-line' onClick={close} sx={{ cursor: 'pointer' }} />
        </DialogTitle>
        <Stack gap={1}>{children}</Stack>
      </Stack>
    </Dialog>
  )
}
