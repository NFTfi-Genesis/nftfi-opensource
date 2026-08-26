import { useState } from 'react'
import {
  Autocomplete as MuiAutocomplete,
  TextField,
  Chip,
  AutocompleteProps as MuiAutocompleteProps,
  TextFieldProps,
  Box,
  alpha,
} from '@mui/material'
import { Scrollbar } from 'src/components/Scrollbar/Scrollbar'

interface CustomAutocompleteProps<T extends object>
  extends Omit<
    MuiAutocompleteProps<T, boolean, boolean, boolean>,
    'renderInput'
  > {
  label?: string
  placeholder?: string
  renderInput?: (params: TextFieldProps) => React.ReactNode
}

function BorderedScrollbar(props: React.ComponentProps<typeof Scrollbar>) {
  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: theme => alpha(theme.palette.grey[500], 0.2),
        borderRadius: '12px',
        mt: 1,
        p: 1.25,
      }}
    >
      <Scrollbar {...props} />
    </Box>
  )
}

export function Autocomplete<T extends object>({
  options,
  value,
  onChange,
  label,
  placeholder,
  multiple = false,
  limitTags = 3,
  getOptionLabel,
  renderOption,
  renderTags,
  renderInput,
  fullWidth = true,
  ...props
}: CustomAutocompleteProps<T>) {
  const [inputValue, setInputValue] = useState('')

  const defaultRenderOption = (
    props: React.HTMLAttributes<HTMLLIElement>,
    option: T
  ) => (
    <li {...props} key={String(option)}>
      {getOptionLabel?.(option) || String(option)}
    </li>
  )

  const defaultRenderTags = (
    selected: T[],
    getTagProps: (props: { index: number }) => Record<string, unknown>
  ) =>
    selected.map((option, index) => (
      <Chip
        {...getTagProps({ index })}
        key={String(option)}
        label={getOptionLabel?.(option) || String(option)}
        size='small'
        variant='soft'
      />
    ))

  const defaultRenderInput = (params: TextFieldProps) => (
    <TextField {...params} label={label} placeholder={placeholder} />
  )

  return (
    <MuiAutocomplete
      fullWidth={fullWidth}
      multiple={multiple}
      limitTags={limitTags}
      options={options}
      value={value}
      onChange={onChange}
      inputValue={inputValue}
      onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
      getOptionLabel={getOptionLabel}
      renderInput={renderInput || defaultRenderInput}
      renderOption={renderOption || defaultRenderOption}
      renderTags={renderTags || defaultRenderTags}
      slotProps={{
        listbox: {
          component: BorderedScrollbar,
          sx: {
            maxHeight: {
              xs: '70vh',
              sm: '80vh',
            },
          },
        },
        paper: { sx: { width: '100%', p: 0 } },
      }}
      {...props}
    />
  )
}
