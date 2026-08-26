import { Box } from '@mui/material'
import { ContactForm } from './Form/ContactForm'

interface DrawerContentContactFormProps {
  onCancel: () => void
}

export function DrawerContentContactForm({
  onCancel,
}: DrawerContentContactFormProps) {
  return (
    <Box mx={2.5} mt={4}>
      <ContactForm onCancel={onCancel} />
    </Box>
  )
}
