import { Box, Stack, TextField, Typography } from '@mui/material'
import { ControllerRenderProps, ControllerFieldState } from 'react-hook-form'
import { useTranslation } from 'src/modules/translation/useTranslation'

type ReceiveNotificationsProps = {
  field: ControllerRenderProps<{ email: string }, 'email'>
  fieldState: ControllerFieldState
  shouldShow: boolean
}

export function ReceiveNotifications({ field, fieldState, shouldShow }: ReceiveNotificationsProps) {
  const { t } = useTranslation()

  if (!shouldShow) {
    return null
  }

  return (
    <Stack gap={1}>
      <Typography variant='subtitle1' sx={{ pt: 3, pb: 1 }}>
        {t('borrow.receive-notifications-about-loans')}{' '}
        <Typography component='span' sx={{ fontStyle: 'italic' }}>
          {t('borrow.recommended')}
        </Typography>
      </Typography>
      <Box>
        <TextField
          fullWidth
          placeholder={t('borrow.add-your-email-address')}
          {...field}
          error={fieldState.invalid}
          helperText={fieldState.error?.message}
          sx={{
            '& .MuiInputBase-root': {
              height: '40px',
              minHeight: '40px',
            },
            '& .MuiInputBase-input': {
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            },
          }}
        />
      </Box>
    </Stack>
  )
}
