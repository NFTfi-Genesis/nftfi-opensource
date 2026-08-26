import { memo } from 'react'
import { Box, Slider } from '@mui/material'
import { FormElementLabel } from './FormElementLabel'

interface RangeSliderProps {
  label: string
  value: number | [number, number]
  onChange: (value: number | [number, number]) => void
  min?: number
  max?: number
  step?: number
  formatLabel?: (value: number) => string
  disabled?: boolean
}

export const RangeSlider = memo(function RangeSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  formatLabel = val => `${val}%`,
  disabled = false,
}: RangeSliderProps) {

  const handleChange = (_event: Event, newValue: number | number[]) => {
    onChange(newValue as typeof value)
  }

  return (
    <Box>
      <FormElementLabel label={label} />
      <Slider
        value={value}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        valueLabelDisplay='on'
        valueLabelFormat={formatLabel}
        disabled={disabled}
        sx={theme => ({
          height: 4,
          '& .MuiSlider-thumb': {
            width: 20,
            height: 20,
          },
          '& .MuiSlider-rail': {
            height: 4,
          },
          '& .MuiSlider-track': {
            height: 4,
          },
          '& .MuiSlider-valueLabel': {
            top: '-8px',
            borderRadius: '4px',
            backgroundColor: theme.palette.customPallette.nftfi.paper,
            padding: '3px 6px',
            '&::before': {
              width: '6px',
              height: '6px',
            },
          },
        })}
      />
    </Box>
  )
})
