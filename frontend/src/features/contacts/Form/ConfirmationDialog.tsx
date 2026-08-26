import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { getTestId } from 'src/utils/testing'
import { TKey } from 'src/modules/translation/TKey'

interface ConfirmationDialogProps {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
  titleKey: TKey
  descriptionKey: TKey
  cancelKey: TKey
  confirmKey: TKey
  confirmVariant?: 'contained' | 'outlined'
}

export function ConfirmationDialog({
  open,
  onCancel,
  onConfirm,
  titleKey,
  descriptionKey,
  cancelKey,
  confirmKey,
  confirmVariant = 'contained',
}: ConfirmationDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth={false}
      fullWidth
      slotProps={{
        paper: {
          sx: {
            maxWidth: 486,
          },
        },
      }}
    >
      <DialogTitle>{t(titleKey)}</DialogTitle>
      <DialogContent>
        <Typography>{t(descriptionKey)}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          variant={confirmVariant}
          onClick={onConfirm}
          sx={{ minWidth: 120 }}
          {...getTestId(confirmKey)}
        >
          {t(confirmKey)}
        </Button>
        <Button
          variant='outlined'
          onClick={onCancel}
          sx={{ minWidth: 120 }}
          {...getTestId(cancelKey)}
        >
          {t(cancelKey)}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
