import { Controller, useFormContext } from 'react-hook-form'
import { TextField, TextFieldProps } from '@mui/material'
// import { useTheme } from '@mui/material';

type RhfInputProps = TextFieldProps & {
  name: string
}

export function RhfInput({
  name,
  label,
  placeholder,
  error,
  helperText,
  fullWidth = true,
}: RhfInputProps) {
  const { control } = useFormContext()
  // const theme = useTheme();
  // const boxShadow = `0 0 0px 1000px ${theme.palette.error.main} inset`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <TextField
          {...field}
          label={label}
          placeholder={placeholder}
          error={error}
          helperText={helperText}
          fullWidth={fullWidth}
          // sx={{
          //   '& input:-webkit-autofill': {
          //     backgroundColor: 'transparent',
          //     '-webkit-box-shadow': `${boxShadow}`,
          //     boxShadow: boxShadow,
          //   },
          // }}
        />
      )}
    />
  )
}
