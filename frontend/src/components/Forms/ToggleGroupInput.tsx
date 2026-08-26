import { memo } from 'react'
import { Box, ButtonGroup, Button } from '@mui/material'
import { getTestId } from 'src/utils/testing'
import { FormElementLabel } from './FormElementLabel'

export type ToggleGroupInputProps<T> = {
  label?: string
  value: T | null
  onChange: (value: T) => void
  options: T[]
  formatOption: (option: T) => string
  name: string
}

export const ToggleGroupInput = memo(function ToggleGroupInput<T>({
  label,
  name,
  value,
  onChange,
  options,
  formatOption,
}: ToggleGroupInputProps<T>) {
  return (
    <Box>
      {label && <FormElementLabel label={label} />}
      <ButtonGroup
        {...getTestId(`form.toggleGroup.${name.toLowerCase()}`)}
        fullWidth
        sx={theme => ({
          '& .MuiButton-root': {
            px: 1.5,
            textTransform: 'none',
            borderColor: theme.palette.divider,
            height: '48px',
          },
        })}
      >
        {options.map(option => {
          const isSelected = option === value
          return (
            <Button
              key={formatOption(option)}
              onClick={() => onChange(option)}
              variant='outlined'
              {...getTestId(`form.toggleGroup.${formatOption(option).toLowerCase()}`, isSelected
                ? 'selected'
                : 'not-selected')}
              sx={theme => ({
                color: isSelected
                  ? theme.palette.common.white
                  : theme.palette.text.secondary,
                backgroundColor: 'transparent',
                fontWeight: 700,
                fontSize: 15,
              })}
            >
              {formatOption(option)}
            </Button>
          )
        })}
      </ButtonGroup>
    </Box>
  )
}) as <T>(props: ToggleGroupInputProps<T>) => JSX.Element
