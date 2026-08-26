import { useRef } from 'react'
import { SnackbarProvider as NotistackProvider } from 'notistack'

import { Iconify } from 'src/components/Iconify'
import { StyledIcon, StyledNotistack } from 'src/modules/notifications/styles'

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode
}

export function NotificationsProvider({ children }: Props) {
  const notistackRef = useRef<NotistackProvider | null>(null)

  return (
    <NotistackProvider
      ref={notistackRef}
      maxSnack={5}
      preventDuplicate
      autoHideDuration={3000}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      iconVariant={{
        info: (
          <StyledIcon color='info'>
            <Iconify icon='eva:info-fill' width={24} />
          </StyledIcon>
        ),
        success: (
          <StyledIcon color='success'>
            <Iconify icon='eva:checkmark-circle-2-fill' width={24} />
          </StyledIcon>
        ),
        warning: (
          <StyledIcon color='warning'>
            <Iconify icon='eva:alert-triangle-fill' width={24} />
          </StyledIcon>
        ),
        error: (
          <StyledIcon color='error'>
            <Iconify icon='solar:danger-bold' width={24} />
          </StyledIcon>
        ),
      }}
      Components={{
        default: StyledNotistack,
        info: StyledNotistack,
        success: StyledNotistack,
        warning: StyledNotistack,
        error: StyledNotistack,
      }}
    >
      {children}
    </NotistackProvider>
  )
}
