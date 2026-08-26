import { memo } from 'react'
import { Typography, Switch, Stack } from '@mui/material'

interface SwitchInputProps {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}

export const SwitchInput = memo(function SwitchInput({ label, value, onChange }: SwitchInputProps) {
  return (
    <Stack direction='row' alignItems='center' sx={{ ml: -1.5 }}>
      <Switch checked={value} onChange={e => onChange(e.target.checked)} />
      <Typography
        sx={theme => ({
          wordWrap: 'break-word',
          color: theme.palette.text.primary,
          fontSize: 14,
          fontWeight: 300,
          lineHeight: '22px',
        })}
      >
        {label}
      </Typography>
    </Stack>
  )
})
