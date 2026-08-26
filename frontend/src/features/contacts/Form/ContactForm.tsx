import { useState, useCallback } from 'react'
import { Stack, Paper, Typography, Box } from '@mui/material'
import { useForm, useFieldArray } from 'react-hook-form'
import { useTheme } from '@mui/material/styles'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { useDebounce } from 'src/hooks/useDebounce'
import { useCreateContact } from 'src/services/hooks/account/useCreateContact'
import { useUpdateContact } from 'src/services/hooks/account/useUpdateContact'
import { Address } from 'src/entities/base/Address'
import { Contact } from 'src/entities/domain/Contact'
import { isEthAddress, isEnsName } from 'src/utils/address'
import { ContactAvatar } from '../Common/ContactAvatar'
import { CancelButton } from './CancelButton'
import { CreateButton } from './CreateButton'
import { AddWalletButton } from './AddWalletButton'
import { FormInput } from './FormInput'
import { ConfirmationDialog } from './ConfirmationDialog'

export type FormValues = Omit<Contact, 'contactId' | 'createdAt'>

interface ContactFormProps {
  onCancel: () => void
  defaultValues?: Contact
}

export function ContactForm({
  onCancel,
  defaultValues,
}: ContactFormProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const { control, handleSubmit, watch, formState, setValue, trigger }
    = useForm<FormValues>({
      defaultValues: defaultValues || {
        name: '',
        addresses: [{ value: '' as Address, ens: undefined }],
        xHandle: '',
        email: '',
        discordHandle: '',
        telegramHandle: '',
        notes: '',
        isFavourite: false,
      },
      mode: 'onChange',
    })

  const { fields, append, remove } = useFieldArray<FormValues>({
    control,
    name: 'addresses',
  })

  const firstWalletAddress = watch('addresses.0.value')
  const addresses = watch('addresses')
  const isFavourite = watch('isFavourite')

  const hasAtLeastOneWallet = addresses.some(({ value }) => value.trim() !== '')
  const hasValidationErrors = Object.keys(formState.errors).length > 0

  const validateAllAddresses = useCallback(() => {
    fields.forEach((_, idx) => {
      trigger(`addresses.${idx}.value`)
    })
  }, [fields, trigger])

  const debouncedValidate = useDebounce(validateAllAddresses, 500)

  const validateWalletAddress = useCallback(
    (value: unknown, index: number) => {
      if (!value || typeof value !== 'string') {
        if (
          !addresses.some(
            (addr, idx) => idx !== index && addr.value.trim() !== ''
          )
        ) {
          return t('contacts.addressRequired')
        }
        return true
      }

      if (!isEthAddress(value) && !isEnsName(value)) {
        return t('contacts.invalidAddress')
      }

      const lowerValue = value.toLowerCase()
      const isDuplicate = addresses.some(
        (addr, idx) => idx !== index && addr.value.toLowerCase() === lowerValue
      )

      if (isDuplicate) {
        return t('contacts.duplicateAddress')
      }

      return true
    },
    [addresses, t]
  )

  const { send: createContact } = useCreateContact()
  const { send: updateContact } = useUpdateContact()

  const onSubmit = useCallback(
    async (data: FormValues) => {
      let success = false
      if (defaultValues?.contactId) {
        ({ success } = await updateContact(defaultValues.contactId, data))
      } else {
        ({ success } = await createContact(data))
      }
      if (success) {
        onCancel()
      }
    },
    [createContact, defaultValues?.contactId, onCancel, updateContact]
  )

  const handleFavouriteClick = useCallback(() => {
    setValue('isFavourite', !isFavourite, { shouldDirty: true })
  }, [isFavourite, setValue])

  const handleCancelClick = useCallback(() => {
    const hasChanges = Object.keys(formState.dirtyFields).length > 0
    if (hasChanges) {
      setShowUnsavedDialog(true)
    } else {
      onCancel()
    }
  }, [formState.dirtyFields, onCancel])

  const handleStay = useCallback(() => {
    setShowUnsavedDialog(false)
  }, [])

  const handleExit = useCallback(() => {
    setShowUnsavedDialog(false)
    onCancel()
  }, [onCancel])

  return (
    <>
      <Paper
        sx={{
          borderRadius: '40px',
          background: theme.palette.customPallette.nftfi.paper,
          p: 1.5,
          pb: 3,
        }}
      >
        <Stack component='form' onSubmit={handleSubmit(onSubmit)} spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
            <ContactAvatar
              address={firstWalletAddress}
              isFavourite={isFavourite}
              onFavouriteClick={handleFavouriteClick}
            />
            <FormInput
              control={control}
              name='name'
              placeholder={t('contacts.enterContactName')}
              sx={{ flex: 1, pr: 1 }}
            />
          </Box>
          <Stack gap={1.5} px={1}>
            <Typography
              variant='subtitle1'
              color={theme.palette.text.secondary}
            >
              {t('contacts.associatedWallets')}
            </Typography>
            {fields.map((field, index) => (
              <FormInput
                key={field.id}
                control={control}
                name={`addresses.${index}.value`}
                placeholder={t('contacts.enterWalletAddress')}
                jazzIcon={true}
                showRemove={fields.length > 1}
                onRemove={() => {
                  remove(index)
                  debouncedValidate()
                }}
                rules={{
                  validate: value => validateWalletAddress(value, index),
                  onChange: debouncedValidate,
                }}
                setValue={setValue}
              />
            ))}
            <AddWalletButton
            // TODO: This should not cast to Address, as empty string is not a valid Address. FormValues should have address as Address | ''
              onClick={() => append({ value: '' as Address, ens: undefined })}
            />
            <Typography
              variant='subtitle1'
              color={theme.palette.text.secondary}
            >
              {t('contacts.contactDetails')}
            </Typography>
            <FormInput
              control={control}
              name='xHandle'
              placeholder={t('contacts.enterXHandle')}
              icon='x-logo'
            />
            <FormInput
              control={control}
              name='email'
              placeholder={t('contacts.enterEmailAddress')}
              icon='envelope'
              rules={{
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: t('contacts.invalidEmail'),
                },
              }}
            />
            <FormInput
              control={control}
              name='discordHandle'
              placeholder={t('contacts.enterDiscordHandle')}
              icon='discord-logo'
            />
            <FormInput
              control={control}
              name='telegramHandle'
              placeholder={t('contacts.enterTelegramHandle')}
              icon='telegram-logo'
            />
            <Typography
              variant='subtitle1'
              color={theme.palette.text.secondary}
            >
              {t('contacts.notes')}
            </Typography>
            <FormInput control={control} name='notes' multiline rows={3} />
            <CancelButton onClick={handleCancelClick} />
            <CreateButton
              disabled={
                !hasAtLeastOneWallet
                || hasValidationErrors
                || formState.isSubmitting
              }
            />
          </Stack>
        </Stack>
      </Paper>

      <ConfirmationDialog
        open={showUnsavedDialog}
        onCancel={handleExit}
        onConfirm={handleStay}
        titleKey='contacts.unsavedChanges.title'
        descriptionKey='contacts.unsavedChanges.description'
        cancelKey='contacts.unsavedChanges.exit'
        confirmKey='contacts.unsavedChanges.stay'
        confirmVariant='contained'
      />
    </>
  )
}
