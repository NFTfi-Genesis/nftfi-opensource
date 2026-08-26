import { memo, useState, useCallback, useRef } from 'react'
import { Box, Button, TextField, ButtonBase } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { FormElementLabel } from './FormElementLabel'
import { ToggleGroupInputProps } from './ToggleGroupInput'

export type ToggleGroupWithCustomIntegerInputProps = Omit<
  ToggleGroupInputProps<number>,
  'formatOption'
> & {
  customInputPlaceholder?: string
}

// TODO: Consider making this more generic so it can be used with other types of inputs, using input parser and validator functions
export const ToggleGroupWithCustomIntegerInput = memo(function ToggleGroupWithCustomIntegerInput({
  label,
  value,
  onChange,
  options,
  customInputPlaceholder = 'Custom',
  name,
}: ToggleGroupWithCustomIntegerInputProps) {
  const [customInputValue, setCustomInputValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const lastButtonValueRef = useRef<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isCustomValue = value !== null && !options.includes(value)
  const buttonOptions = options

  // Track the last button value before switching to custom
  if (!isCustomValue) {
    lastButtonValueRef.current = value
  }

  const handleCustomInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value

      // If user deletes all input, revert to last button value
      if (inputValue === '') {
        setCustomInputValue('')
        if (lastButtonValueRef.current !== null) {
          onChange(lastButtonValueRef.current)
        }
        return
      }

      // Only allow digits (no decimals, no signs, no leading zeros except single "0")
      const digitsOnlyRegex = /^\d+$/
      if (!digitsOnlyRegex.test(inputValue)) {
        return
      }

      // Remove leading zeros
      const normalizedValue = inputValue.replace(/^0+/, '') || '0'
      setCustomInputValue(normalizedValue)

      const numValue = parseInt(normalizedValue, 10)
      if (numValue > 0) {
        onChange(numValue)
      }
    },
    [onChange]
  )

  const handleCustomInputFocus = useCallback(() => {
    setIsFocused(true)
    if (isCustomValue) {
      setCustomInputValue(value.toString())
    }
  }, [value, isCustomValue])

  const handleCustomInputBlur = useCallback(() => {
    setIsFocused(false)
    setCustomInputValue('')
  }, [])

  return (
    <Box>
      {label && <FormElementLabel label={label} />}
      <Box sx={{ display: 'flex', width: '100%' }}>
        {buttonOptions.map((option, index) => {
          const isSelected = option === value
          const isFirst = index === 0

          return (
            <Button
              key={option}
              onClick={() => onChange(option)}
              variant='outlined'
              disableRipple={false}
              sx={theme => ({
                flex: '0.5',
                minWidth: '35px',
                px: 0,
                height: '48px',
                textTransform: 'none',
                borderColor: theme.palette.divider,
                borderWidth: '1px',
                borderRightColor: 'transparent',
                // borderLeftWidth: '1px',
                color: isSelected
                  ? theme.palette.common.white
                  : theme.palette.text.secondary,
                backgroundColor: 'transparent',
                fontWeight: 700,
                fontSize: 15,
                borderTopLeftRadius: isFirst
                  ? theme.shape.borderRadius
                  : 0,
                borderBottomLeftRadius: isFirst
                  ? theme.shape.borderRadius
                  : 0,
                borderTopRightRadius: 0,
                borderBottomRightRadius: 0,
                '&:hover': {
                  // Use inset box-shadow to simulate thicker borders without layout shift
                  boxShadow: isSelected
                    ? `inset 0 0 0 1px ${theme.palette.common.white}`
                    : `inset 0 0 0 1px ${theme.palette.text.secondary}`,
                },
                '& .MuiTouchRipple-root': {
                  color: alpha(theme.palette.common.white, 0.3),
                },
              })}
            >
              {option}
            </Button>
          )
        })}

        <ButtonBase
          disableRipple={false}
          component='div'
          sx={theme => ({
            flex: '1',
            width: '65px',
            minWidth: '65px',
            maxWidth: '135px',
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 0,
            borderTopRightRadius: theme.shape.borderRadius,
            borderBottomRightRadius: theme.shape.borderRadius,
            '& .MuiTouchRipple-root': {
              color: alpha(theme.palette.common.white, 0.3),
            },
          })}
        >
          <TextField
            name={ `${name}-custom` }
            inputRef={inputRef}
            value={customInputValue}
            onChange={handleCustomInputChange}
            onFocus={handleCustomInputFocus}
            onBlur={handleCustomInputBlur}
            placeholder={isFocused
              ? ''
              : isCustomValue
                ? value.toString()
                : customInputPlaceholder}
            type='text'
            slotProps={{
              htmlInput: {
                inputMode: 'numeric',
                pattern: '[0-9]*',
                style: { textAlign: 'center' },
              }
            }}
            sx={theme => ({
              width: '100%',
              height: '100%',
              '& .MuiOutlinedInput-root': {
                height: '48px',
                boxSizing: 'border-box',
                borderTopLeftRadius: 0,
                borderBottomLeftRadius: 0,
                borderTopRightRadius: theme.shape.borderRadius,
                borderBottomRightRadius: theme.shape.borderRadius,
                backgroundColor: 'transparent',
                '& fieldset': {
                  borderColor: theme.palette.divider,
                  borderWidth: '1px',
                },
                '&:hover': {
                  // Use inset box-shadow on left to simulate thicker border without layout shift
                  boxShadow: `inset 0 0 0 1px ${theme.palette.text.secondary}`,
                  borderWidth: '1px',
                },
                '&:hover fieldset': {
                  borderWidth: '1px',
                  borderColor: theme.palette.text.secondary,
                  boxShadow: `inset 0 0 0 1px ${theme.palette.text.secondary}`,
                },
                '&.Mui-focused fieldset': {
                  borderWidth: '1px',
                  borderColor: theme.palette.common.white,
                  boxShadow: `inset 0 0 0 1px ${theme.palette.common.white}`,
                },
              },
              '& .MuiOutlinedInput-input': {
                padding: '0',
                fontSize: 15,
                fontWeight: 700,
                color: isCustomValue
                  ? theme.palette.common.white
                  : theme.palette.text.secondary,
                '&::placeholder': {
                  color: isCustomValue
                    ? theme.palette.common.white
                    : theme.palette.text.secondary,
                  opacity: 1,
                  fontWeight: 600,
                },
              },
            })}
          />
        </ButtonBase>
      </Box>
    </Box>
  )
})
