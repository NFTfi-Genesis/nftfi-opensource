import { useRef, useState, useMemo, useCallback } from 'react'
import { TextField, Stack, Typography, Menu, MenuItem, InputAdornment } from '@mui/material'
import { useEnsReverseLookup } from 'src/hooks/useEnsReverseLookup'
import { useEnsReverseLookupMany } from 'src/hooks/useEnsReverseLookupMany'
import { Address } from 'src/entities/base/Address'
import { useTranslation } from 'src/modules/translation/useTranslation'

// TODO: move to utils with descriptive name and tests
function formatAddresses(wallets: { address: Address, ens: string | null }[]) {
  if (!wallets || !wallets.length) return ''

  let result = ''

  for (let i = 0; i < wallets.length; i++) {
    const item = wallets[i]
    const address = item.address || ''
    const ens = item.ens || null

    if (result.length >= 15) break

    if (result && result.length < 15) {
      result += ', '
    }

    let toAdd = ''
    if (ens) {
      toAdd = ens
    } else {
      toAdd = address.slice(2, 8)
    }

    const remainingSpace = 18 - result.length

    if (toAdd.length > remainingSpace) {
      if (remainingSpace > 3) {
        result += toAdd.slice(0, remainingSpace - 3) + '...'
      } else {
        result += '...'.slice(0, remainingSpace)
      }
      break
    } else {
      result += toAdd

      if (i < wallets.length - 1 && result.length + 4 >= 15) {
        result += '...'
        break
      }
    }
  }

  return result
}

interface WalletAddressesInputProps {
  value: Address[]
  onChange: (addresses: Address[]) => void
  label?: string
  placeholder?: string
}

export function WalletAddressesInput({ value, onChange, label, placeholder }: WalletAddressesInputProps) {
  const { t } = useTranslation()
  const walletsEnsNames = useEnsReverseLookupMany(value)

  const handleRemoveLastWallet = useCallback(() => {
    if (value.length > 0) {
      const updatedWallets = value.slice(0, -1)
      onChange(updatedWallets)
    }
  }, [value, onChange])

  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)
  const [inputValue, setInputValue] = useState<Address | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const textFieldRef = useRef<HTMLDivElement>(null)
  const ens = useEnsReverseLookup(inputValue)

  // TODO: Move to utils Addresses / remove
  const isValidEthereumAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value
    setInputValue(inputVal as Address)

    if (isValidEthereumAddress(inputVal)) {
      setMenuAnchorEl(textFieldRef.current)
    } else {
      setMenuAnchorEl(null)
    }
  }

  const handleMenuItemClick = () => {
    const newAddresses = [...value, inputValue as Address]
    onChange(newAddresses)
    setInputValue(null)
    setMenuAnchorEl(null)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && inputValue === null && value.length > 0) {
      handleRemoveLastWallet()
      event.preventDefault()
    }
  }

  const computedPlaceholder = useMemo(() => {
    if (placeholder) return placeholder
    return value.length === 0
      ? t('filters.paste-wallet-address')
      : ''
  }, [placeholder, value.length, t])

  return (
    <>
      <TextField
        ref={textFieldRef}
        inputRef={inputRef}
        name='wallet'
        variant='outlined'
        fullWidth
        label={label}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (isValidEthereumAddress(inputValue ?? '')) {
            setMenuAnchorEl(textFieldRef.current)
          }
        }}
        placeholder={computedPlaceholder}
        value={inputValue ?? ''}
        error={inputValue
          ? !isValidEthereumAddress(inputValue)
          : false}
        helperText={inputValue && !isValidEthereumAddress(inputValue)
          ? t('filters.invalid-wallet-address')
          : ''}
        slotProps={{
          input: {
            startAdornment:
              value.length > 0
                ? (
                  <InputAdornment position='start'>
                    <Typography variant='body2' color='text.secondary' noWrap>
                      {formatAddresses(walletsEnsNames)}
                    </Typography>
                  </InputAdornment>
                )
                : null,
          },
        }}
        sx={theme => ({
          '& .MuiOutlinedInput-root': {
            minHeight: '48px',
            backgroundColor: 'transparent',
            '& fieldset': {
              borderColor: theme.palette.divider,
            },
            '&:hover fieldset': {
              borderColor: theme.palette.divider,
            },
            '&.Mui-focused fieldset': {
              borderColor: theme.palette.divider,
            },
          },
          '& .MuiOutlinedInput-input': {
            color: theme.palette.text.primary,
            fontSize: 15,
            fontWeight: 400,
            '&::placeholder': {
              color: theme.palette.text.secondary,
              opacity: 0.6,
            },
          },
          '& .MuiInputAdornment-root': {
            color: theme.palette.text.secondary,
          },
          '& .MuiFormHelperText-root': {
            marginLeft: 0,
          },
        })}
      />
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={() => setMenuAnchorEl(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        slotProps={{
          paper: {
            sx: theme => ({
              width: textFieldRef.current?.offsetWidth,
              bgcolor: theme.palette.background.default,
              backgroundImage: 'none',
              border: '1px solid',
              borderColor: theme.palette.divider,
              mt: 1,
            }),
          },
        }}
      >
        <MenuItem onClick={handleMenuItemClick}>
          <Stack width='100%'>
            {ens && (
              <Typography noWrap variant='body2' color='text.secondary'>
                {inputValue}
              </Typography>
            )}
            <Typography noWrap variant='body1' fontWeight='bold'>
              {ens || inputValue}
            </Typography>
          </Stack>
        </MenuItem>
      </Menu>
    </>
  )
}
