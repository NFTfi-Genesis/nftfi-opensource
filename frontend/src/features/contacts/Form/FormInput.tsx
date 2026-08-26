import { useState, useEffect, useCallback } from 'react'
import {
  TextField,
  IconButton,
  InputAdornment,
  Box,
  BoxProps,
} from '@mui/material'
import {
  UseFormSetValue,
  UseControllerProps,
  useController,
} from 'react-hook-form'
import { useTheme, alpha } from '@mui/material/styles'
import { isAddress } from 'viem'
import GreyJazzIcon from 'src/assets/images/svg/grey-jazz-icon.svg'
import { Iconify } from 'src/components/Iconify'
import { JazzIconAvatar } from 'src/components/JazzIconAvatar'
import { Address } from 'src/entities/base/Address'
import { useEnsReverseLookup } from 'src/hooks/useEnsReverseLookup'
import { useEnsLookup } from 'src/hooks/useEnsLookup'
import { isEnsName } from 'src/utils/address'
import { getTestId } from 'src/utils/testing'
import { FormValues } from './ContactForm'

interface FormInputProps extends UseControllerProps<FormValues> {
  placeholder?: string
  multiline?: boolean
  rows?: number
  icon?: string
  jazzIcon?: boolean
  onRemove?: () => void
  showRemove?: boolean
  sx?: BoxProps['sx']
  setValue?: UseFormSetValue<FormValues>
}

export function FormInput({
  placeholder,
  multiline,
  rows,
  icon,
  jazzIcon,
  onRemove,
  showRemove,
  sx,
  setValue,
  ...props
}: FormInputProps) {
  const theme = useTheme()
  const { field, fieldState } = useController(props)
  const fieldValue = typeof field.value === 'string'
    ? field.value
    : ''

  const [displayValue, setDisplayValue] = useState(fieldValue)
  const [isShowingEnsInput, setIsShowingEnsInput] = useState(false)

  const ens = useEnsReverseLookup(
    isAddress(fieldValue)
      ? fieldValue as Address
      : null
  )

  const resolvedAddress = useEnsLookup(
    isEnsName(fieldValue)
      ? fieldValue
      : undefined
  )

  useEffect(() => {
    if (ens) {
      setDisplayValue(ens)
      setIsShowingEnsInput(false)
    } else if (
      resolvedAddress
      && isAddress(resolvedAddress)
      && isEnsName(fieldValue)
    ) {
      setValue?.(props.name, resolvedAddress)
      setIsShowingEnsInput(true)
    } else if (!isShowingEnsInput) {
      setDisplayValue(fieldValue)
    }
  }, [
    fieldValue,
    ens,
    resolvedAddress,
    props.name,
    setValue,
    isShowingEnsInput,
  ])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setDisplayValue(value)
      setIsShowingEnsInput(false) // Reset ENS input state when user types
      field.onChange(value)
    },
    [field]
  )

  const handleClear = () => {
    field.onChange('')
    setDisplayValue('')
    setIsShowingEnsInput(false)
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3.5, ...sx }}>
      {(icon || jazzIcon) && (
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: theme.palette.customPallette.nftfi.paper,
            border: `1px solid ${alpha(theme.palette.grey[50], 0.56)}`,
            color: alpha(theme.palette.grey[50], 0.56),
            flexShrink: 0,
          }}
        >
          {icon
            ? (
              <Iconify icon={`ph:${icon}`} width={24} />
            )
            : jazzIcon && field.value
              ? (
                <JazzIconAvatar
                  address={field.value as Address}
                  diameter={24}
                  noBorder
                />
              )
              : (
                <GreyJazzIcon width={24} height={24} />
              )}
        </Box>
      )}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flex: 1 }}>
        <TextField
          fullWidth
          placeholder={placeholder}
          multiline={multiline}
          rows={rows}
          {...field}
          value={displayValue}
          onChange={handleInputChange}
          error={fieldState.invalid}
          helperText={fieldState.error?.message}
          sx={{
            '& .MuiInputBase-root': {
              height: !multiline
                ? '40px'
                : 'auto',
              minHeight: !multiline
                ? '40px'
                : 'auto',
            },
            '& .MuiInputBase-input': {
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            },
          }}
          slotProps={{
            input: {
              endAdornment: !multiline && field.value && (
                <InputAdornment position='end'>
                  <IconButton
                    onClick={handleClear}
                    edge='end'
                    sx={{
                      color: theme.palette.text.secondary,
                      '&:hover': {
                        color: theme.palette.text.primary,
                      },
                    }}
                  >
                    <Iconify icon='ph:x-circle' />
                  </IconButton>
                </InputAdornment>
              ),
            },
            formHelperText: {
              ...getTestId(`contacts.form.${props.name}.error`),
            } as Record<string, string>,
          }}
        />
        {showRemove && onRemove && (
          <IconButton
            {...getTestId(`contacts.form.${props.name}.remove`)}
            onClick={onRemove}
            sx={{
              color: theme.palette.text.secondary,
              '&:hover': {
                color: theme.palette.text.primary,
              },
              mt: 0.25,
            }}
          >
            <Iconify icon='ph:trash' />
          </IconButton>
        )}
      </Box>
    </Box>
  )
}
