import { Alert } from '@mui/material'
import { useBreakpoints } from 'src/modules/theme/useBreakpoints'
import { AlertProps } from './types'

export function AlertComponent({
  isActive,
  message,
  severity,
  onClose,
  onClick,
}: AlertProps) {
  const { isMobileView } = useBreakpoints()

  if (!isActive) return null

  return (
    <Alert
      severity={severity}
      onClose={onClose}
      onClick={onClick}
      key={message}
      sx={{
        marginTop: isMobileView
          ? '8px'
          : '12px',
        marginBottom: isMobileView
          ? '12px'
          : '0',
        marginRight: isMobileView
          ? '16px'
          : '24px',
        marginLeft: isMobileView
          ? '16px'
          : '24px',
        padding: '0 10px',
      }}
    >
      {message}
    </Alert>
  )
}
