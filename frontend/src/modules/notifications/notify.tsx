import React from 'react'
import { enqueueSnackbar, closeSnackbar } from 'notistack'
import { IconButton, Box, Stack } from '@mui/material'
import { Iconify } from 'src/components/Iconify'
import { getTestId } from 'src/utils/testing'

export type ActionButtonProps = {
  color?: NotificationType
} & Record<string, unknown>

export type ActionButtonComponent = React.ComponentType<ActionButtonProps>

export enum NotificationType {
  Info = 'info',
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
}

export type Notify = {
  message: string | React.ReactNode
  variant?: NotificationType
  /** Should use the ActionButton component */
  action?:
    | React.ReactElement
    | [React.ReactElement]
    | [React.ReactElement, React.ReactElement]
  duration?: number
  noCloseButton?: boolean
  id?: string
}

export const notify = ({
  message,
  variant = NotificationType.Info,
  action,
  duration,
  noCloseButton,
  id,
}: Notify) => {
  const actions = (snackbarId: string | number) => {
    let actionElements: React.ReactElement[] = []

    if (action) {
      const actionArray = Array.isArray(action)
        ? action
        : [action]

      actionElements = actionArray.map((actionElement, index) =>
        React.cloneElement(actionElement, {
          ...actionElement.props,
          color: index === 0
            ? variant
            : 'inherit',
          variant: index === 0
            ? 'soft'
            : 'outlined',
          key: index,
        })
      )
    }

    return (
      <Stack direction='row' alignItems='center' spacing={1.5}>
        <Stack direction='row' spacing={1}>
          {actionElements.map(element => (
            <Box key={element.key} width='max-content'>
              {element}
            </Box>
          ))}
        </Stack>
        {!noCloseButton && (
          <IconButton
            size='small'
            onClick={() => closeSnackbar(snackbarId)}
            aria-label='Close notification'
            {...getTestId(`snackbar-${id}-close-button`)}
          >
            <Iconify width={16} icon='mingcute:close-line' />
          </IconButton>
        )}
      </Stack>
    )
  }

  return enqueueSnackbar(message, {
    variant,
    action: actions,
    autoHideDuration: duration,
    key: id,
    anchorOrigin: variant === NotificationType.Success
      ? { vertical: 'top', horizontal: 'center' }
      : { vertical: 'bottom', horizontal: 'center' },
  })
}
