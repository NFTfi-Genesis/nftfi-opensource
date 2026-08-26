import { Button, ButtonProps, LinkProps } from '@mui/material'

// Exclude variant from LinkProps to avoid conflict with ButtonProps variant
type ActionButtonProps = ButtonProps & Omit<LinkProps, 'variant'>

export function ActionButton(props: ActionButtonProps) {
  return (
    <Button variant='soft' {...props}>
      {props.children}
    </Button>
  )
}

export type ActionButton = typeof ActionButton
