import { z } from 'zod'
import { Button, InputAdornment, Stack, TextField, Typography } from '@mui/material'
import { useCallback } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from 'src/components/Modal/Modal'
import { Account } from 'src/entities/domain/Account'
import { FormProvider } from 'src/modules/forms/FormProvider'
import { Iconify } from 'src/components/Iconify'
import { useUpdateAccount } from 'src/services/hooks/account/useUpdateAccount'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { Modals } from 'src/modules/modals/Modals'
import { useModals } from 'src/modules/modals/useModals'

const editProfileFormSchema = z.object({
  username: z.string(),
  email: z.string().email().optional().or(z.literal('')),
  discordUsername: z.string(),
})

type EditProfileFormData = z.infer<typeof editProfileFormSchema>

export type EditProfileModalProps = {
  account: Account
}

export const EditProfileModal = function EditDetailsModal(
  { account }: EditProfileModalProps,
) {
  const { t } = useTranslation()
  const { send: updateAccount } = useUpdateAccount()
  const { close } = useModals(Modals.EditProfile)
  const formMethods = useForm<EditProfileFormData>({
    resolver: zodResolver(editProfileFormSchema),
    defaultValues: {
      username: account.username,
      email: account.email,
      discordUsername: account.discordUsername,
    },
  })

  const { control, formState, trigger, getValues, setValue } = formMethods

  const handleSave = useCallback(async () => {
    const isValid = await trigger()
    if (isValid) {
      const data = getValues()
      const { success } = await updateAccount(data)
      if (success ) {
        close()
      }
    }
  }, [trigger, updateAccount, close, getValues])

  return (
    <Modal
      modal={Modals.EditProfile}
      title={<Typography variant='h6'>{t('user-details-page.edit-details')}</Typography>}
    >
      <FormProvider
        formMethods={formMethods}
      >
        <Stack gap={2}>
          <Stack gap={1} direction='row'>
            <Controller
              control={control}
              name='username'
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('user-details-page.username')}
                  error={!!formState.errors.username}
                  helperText={formState.errors.username?.message}
                  fullWidth
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position='end'>
                          <Iconify width={24}
                            icon='ph:x-circle'
                            onClick={() => setValue('username', '')}
                            sx={{
                              cursor: 'pointer',
                              alignSelf: 'center',
                            }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              )}
            />
          </Stack>
          <Stack gap={1} direction='row'>
            <Controller
              control={control}
              name='email'
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('user-details-page.email')}
                  error={!!formState.errors.email}
                  helperText={formState.errors.email?.message}
                  fullWidth
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position='end'>
                          <Iconify width={24} icon='ph:x-circle' onClick={() => setValue('email', '')} sx={{ cursor: 'pointer', alignSelf: 'center' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              )}
            />
          </Stack>
          <Stack gap={1} direction='row'>
            <Controller
              control={control}
              name='discordUsername'
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('user-details-page.discord')}
                  error={!!formState.errors.discordUsername}
                  helperText={formState.errors.discordUsername?.message}
                  fullWidth
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position='end'>
                          <Iconify width={24} icon='ph:x-circle' onClick={() => setValue('discordUsername', '')} sx={{ cursor: 'pointer', alignSelf: 'center' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              )}
            />
          </Stack>
          <Button
            variant='contained'
            color='primary'
            onClick={handleSave}
          >
            {t('user-details-page.save-changes')}
          </Button>
        </Stack>
      </FormProvider>
    </Modal>
  )
}
