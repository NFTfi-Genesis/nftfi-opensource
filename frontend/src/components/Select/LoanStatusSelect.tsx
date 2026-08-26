import {
  Box,
  InputLabel,
  MenuItem,
  FormControl,
  Select,
  Checkbox,
  SelectChangeEvent,
  ListItemText,
  OutlinedInput,
  Typography,
} from '@mui/material'
import { LoanStatus } from 'src/entities/domain/Loan'
import { LoanStatusDisplayKeys } from 'src/utils/loans'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { getTestId } from 'src/utils/testing'

interface LoanStatusSelectProps {
  onChange: (params: { statuses: LoanStatus[] }) => void
  statuses?: LoanStatus[]
  options: LoanStatus[]
  'data-test-id'?: string
}

export function LoanStatusSelect({
  onChange,
  statuses = [],
  options,
  'data-test-id': dataTestId = 'status',
}: LoanStatusSelectProps) {
  const { t } = useTranslation()

  const handleChange = (event: SelectChangeEvent<LoanStatus[]>) => {
    const value = event.target.value
    onChange({ statuses: value as LoanStatus[] })
  }

  const label = t('filters.status')

  return (
    <Box sx={{ minWidth: 120 }}>
      <FormControl fullWidth>
        <InputLabel>{label}</InputLabel>
        <Select
          {...getTestId(dataTestId)}
          multiple
          value={statuses}
          onChange={handleChange}
          input={<OutlinedInput label={label} />}
          renderValue={() => (
            <Typography
              variant='body2'
              color='text.secondary'
              noWrap
              sx={{ width: '100%', px: 1.75 }}
            >
              {statuses.map(s => t(LoanStatusDisplayKeys[s])).join(', ')}
            </Typography>
          )}
        >
          {options.map(status => (
            <MenuItem key={status} value={status}>
              <Checkbox checked={statuses.includes(status)} />
              <ListItemText primary={t(LoanStatusDisplayKeys[status])} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  )
}
