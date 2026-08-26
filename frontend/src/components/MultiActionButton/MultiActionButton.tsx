import { useState, useCallback, useRef } from 'react'
import { Button, ButtonGroup, ButtonProps, Menu, MenuItem, SxProps, Theme } from '@mui/material'
import { Iconify } from 'src/components/Iconify'
import { getTestId, TestIdAttributes } from 'src/utils/testing'

export type MultiActionButtonAction = {
  label: string
  onClick: () => void
} & Partial<TestIdAttributes>

export type MultiActionButtonProps = {
  prioritisedActions: MultiActionButtonAction[]
  sx?: SxProps<Theme>
  variant?: ButtonProps['variant']
  isMinimised?: boolean
}

export function MultiActionButton({ prioritisedActions, sx, variant = 'link', isMinimised = false }:MultiActionButtonProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const buttonGroupRef = useRef<HTMLDivElement>(null)
  const open = Boolean(anchorEl)

  const handleMainButtonClick = useCallback(() => {
    const action = prioritisedActions[0]
    if (action) {
      action.onClick()
    }
  }, [prioritisedActions])

  const handleDropdownClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation()
    setAnchorEl(event.currentTarget)
  }, [])

  const handleClose = useCallback(() => {
    setAnchorEl(null)
  }, [])

  const handleButtonClick = useCallback((action: MultiActionButtonAction) => {
    action.onClick()
    handleClose()
  }, [handleClose])

  if (prioritisedActions.length === 0) {
    return null
  }

  const mainAction = prioritisedActions[0]
  if (!mainAction) {
    return null
  }

  if (isMinimised) {
    return (
      <>
        <Button
          variant={variant}
          onClick={handleDropdownClick}
          sx={{
            minWidth: 'auto',
            px: 1,
            ...(sx as object),
            ...(open && {
              backgroundColor: 'primary.main',
            }),
          }}
          {...getTestId('table.multiAction.open')}
        >
          <Iconify icon='ph:caret-down' width={20} />
        </Button>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          slotProps={{
            paper: {
              sx: theme => ({
                mt: 0.5,
                borderRadius: 1,
                boxShadow: theme.customShadows.dropdown,
              }),
            },
          }}
        >
          {prioritisedActions.map((action, index) => (
            <MenuItem
              key={index}
              sx={{ fontWeight: 600, textAlign: 'center', justifyContent: 'center' }}
              {...action}
              onClick={() => handleButtonClick(action)}
            >
              {action.label}
            </MenuItem>
          ))}
        </Menu>
      </>
    )
  }

  // Normal display when not stuck
  return (
    <>
      <ButtonGroup
        {...getTestId('table.multiAction')}
        ref={buttonGroupRef}
        sx={{
          '& .MuiButtonGroup-grouped:not(:last-of-type)': {
            borderRight: 'none',
          },
          '& .MuiButtonGroup-lastButton': {
            paddingLeft: '1px',
            paddingRight: '13px',
          },
        }}
      >
        <Button
          variant={variant}
          {...prioritisedActions[0]}
          onClick={handleMainButtonClick}
          sx={{
            whiteSpace: 'nowrap',
            paddingRight: prioritisedActions.length > 1
              ? 0.5
              : 1.5 ,
            ...(sx as object),
            ...(open && {
              backgroundColor: 'primary.main',
              color: 'grey.50',
            }),
          }}
        >
          {mainAction.label}
        </Button>
        {prioritisedActions.length > 1 && <Button
          variant={variant}
          onClick={handleDropdownClick}
          sx={{
            minWidth: 'auto',
            px: 1,
            ...(sx as object),
            ...(open && {
              backgroundColor: 'primary.main',
            }),
          }}
          {...getTestId('table.multiAction.open')}
        >
          <Iconify icon='ph:caret-down' width={20} />
        </Button>}
      </ButtonGroup>
      {prioritisedActions.length > 1 && <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        slotProps={{
          paper: {
            sx: theme => ({
              mt: 0.5,
              borderRadius: 1,
              boxShadow: theme.customShadows.dropdown,
            }),
          },
        }}
      >
        {prioritisedActions.slice(1).map((action, index) => (
          <MenuItem
            key={index + 1}
            sx={{ fontWeight: 600, textAlign: 'center', justifyContent: 'center' }}
            {...action}
            onClick={() => handleButtonClick(action)}
          >
            {action.label}
          </MenuItem>
        ))}
      </Menu>}
    </>
  )
}
