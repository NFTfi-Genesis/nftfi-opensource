import { Box, Stack, useTheme } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { Iconify } from 'src/components/Iconify'
import { Contact } from 'src/entities/domain/Contact'
import { getTestId } from 'src/utils/testing'

interface SocialIconListProps {
  contact: Contact
  index: number
}

export function SocialIconList({ contact, index }: SocialIconListProps) {
  const theme = useTheme()

  const circleContainerStyle = {
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: `1px solid ${alpha(theme.palette.common.white, 0.56)}`,
    color: alpha(theme.palette.common.white, 0.56),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: theme.palette.customPallette.nftfi.paper,
    flexShrink: 0,
  }

  return (
    <Stack direction='row' sx={{ '& > *:not(:first-of-type)': { ml: -2 } }}>
      {contact.xHandle && (
        <Box
          sx={circleContainerStyle}
          {...getTestId(`contacts.socials.x.${index}`)}
        >
          <Iconify icon='ph:x-logo' sx={{ width: 20, height: 20 }} />
        </Box>
      )}
      {contact.email && (
        <Box
          sx={circleContainerStyle}
          {...getTestId(`contacts.socials.email.${index}`)}
        >
          <Iconify icon='ph:envelope' sx={{ width: 20, height: 20 }} />
        </Box>
      )}
      {contact.discordHandle && (
        <Box
          sx={circleContainerStyle}
          {...getTestId(`contacts.socials.discord.${index}`)}
        >
          <Iconify icon='ph:discord-logo' sx={{ width: 20, height: 20 }} />
        </Box>
      )}
      {contact.telegramHandle && (
        <Box
          sx={circleContainerStyle}
          {...getTestId(`contacts.socials.telegram.${index}`)}
        >
          <Iconify icon='ph:telegram-logo' sx={{ width: 20, height: 20 }} />
        </Box>
      )}
    </Stack>
  )
}
