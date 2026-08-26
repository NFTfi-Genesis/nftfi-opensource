import { useState } from 'react'
import { Box, TextField, InputAdornment, IconButton } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { Iconify } from 'src/components/Iconify'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { getTestId } from 'src/utils/testing'

interface SearchProps {
  value?: string
  onChange?: (value: string) => void
  onClear?: () => void
}

export function Search({ value = '', onChange, onClear }: SearchProps) {
  const theme = useTheme()
  const { t } = useTranslation()
  const [inputValue, setInputValue] = useState(value)

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value
    setInputValue(newValue)
    onChange?.(newValue)
  }

  const handleClear = () => {
    setInputValue('')
    onChange?.('')
    onClear?.()
  }

  return (
    <Box flexGrow={1}>
      <TextField
        fullWidth
        placeholder={t('contacts.search')}
        value={inputValue}
        onChange={handleInputChange}
        name='search'
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position='start'>
                <Iconify
                  icon='eva:search-fill'
                  width={20}
                  sx={{ color: theme.palette.text.disabled }}
                />
              </InputAdornment>
            ),
            endAdornment: inputValue && (
              <InputAdornment position='end'>
                <IconButton
                  onClick={handleClear}
                  {...getTestId('contacts.search.clear')}
                  size='small'
                  sx={{
                    color: theme.palette.text.secondary,
                    '&:hover': {
                      color: theme.palette.text.primary,
                    },
                  }}
                >
                  <Iconify icon='eva:close-fill' width={16} />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
        sx={{
          '& .MuiInputBase-root': {
            color: theme.palette.text.primary,
          },
          '& .MuiInputBase-input': {
            '&::placeholder': {
              color: theme.palette.text.disabled,
              opacity: 1,
            },
          },
        }}
      />
    </Box>
  )
}
