import {
  Box,
  InputLabel,
  MenuItem,
  FormControl,
  Select,
  SelectChangeEvent,
  ListItemText,
  OutlinedInput,
  Typography,
  Divider,
} from '@mui/material'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { DueWithin, DueWithinLabels } from 'src/utils/dueWithin'
import { getTestId } from 'src/utils/testing'

interface DueSelectProps {
  onChange: (params: { dueWithin: DueWithin }) => void
  due?: DueWithin | null
  'data-test-id'?: string
}

export function DueSelect({ onChange, due, 'data-test-id': dataTestId = 'dueIn' }: DueSelectProps) {
  const { t } = useTranslation()

  const handleChange = (event: SelectChangeEvent<DueWithin>) => {
    const value = event.target.value
    onChange({ dueWithin: value as DueWithin })
  }

  const dueOptions = Object.values(DueWithin).filter(
    (value): value is DueWithin => typeof value === 'number'
  )

  return (
    <Box sx={{ minWidth: 120 }}>
      <FormControl fullWidth>
        <InputLabel>{t('filters.due-within')}</InputLabel>
        <Select
          {...getTestId(dataTestId)}
          value={due ?? ''}
          onChange={handleChange}
          input={<OutlinedInput label={t('filters.due-within')} />}
          renderValue={() => (
            <Typography variant='body2' color='text.secondary'>
              {due
                ? DueWithinLabels[due]
                : t('filters.select-max-period')}
            </Typography>
          )}
          MenuProps={{
            PaperProps: {
              sx: {
                '& .MuiMenuItem-root': {
                  maxWidth: '272px',
                },
              },
            },
          }}
        >
          {dueOptions.map(option => (
            <MenuItem key={option} value={option}>
              <ListItemText primary={DueWithinLabels[option]} />
            </MenuItem>
          ))}
          <Divider sx={{ my: 0.5 }} />
          <MenuItem
            disabled
            dense
            sx={{
              fontSize: '0.7rem',
              fontStyle: 'italic',
              whiteSpace: 'normal',
              py: 0.5,
              lineHeight: 1.2,
            }}
          >
            {t('filters.due-note')}
          </MenuItem>
        </Select>
      </FormControl>
    </Box>
  )
}
