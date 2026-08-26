import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { AddContactButton } from './Common/AddContactButton'

interface DrawerContentNoContactProps {
  onAddContact: () => void
}

export function DrawerContentNoContact({
  onAddContact,
}: DrawerContentNoContactProps) {
  const { t } = useTranslation()

  return (
    <Stack alignItems='center' px={2.5}>
      <Typography variant='h3' mt={9} mb={1.25}>
        {t('contacts.noContacts')}
      </Typography>

      <Typography variant='body1' mb={5.25}>
        {t('contacts.addFirstContact')}
      </Typography>

      <AddContactButton
        onAddContact={onAddContact}
        sx={{ alignSelf: 'stretch' }}
      />
    </Stack>
  )
}
