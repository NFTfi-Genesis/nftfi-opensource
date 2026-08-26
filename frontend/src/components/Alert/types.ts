export enum AlertSeverity {
  Success = 'success',
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
}

export interface AlertProps {
  isActive: boolean
  message: string
  severity: AlertSeverity
  onClose?: () => void
  onClick?: () => void
}

export const defaultAlertState: AlertProps = {
  isActive: false,
  message: '',
  severity: AlertSeverity.Info,
}
