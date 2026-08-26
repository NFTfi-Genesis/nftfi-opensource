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
import { Currency } from 'src/entities/domain/Currency'
import { getCurrencyTicker } from 'src/utils/currencies'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { getTestId } from 'src/utils/testing'

interface CurrencySelectProps {
  onChange: (params: { currency: Currency[] }) => void
  currency?: Currency[]
  'data-test-id'?: string
}

const currencyOptions = [
  Currency.WETH,
  Currency.USDC,
  Currency.DAI,
  Currency.WSTETH,
]

export function CurrencySelect({
  onChange,
  currency = [],
  'data-test-id': dataTestId = 'currency',
}: CurrencySelectProps) {
  const { t } = useTranslation()

  const handleChange = (event: SelectChangeEvent<Currency[]>) => {
    const value = event.target.value
    onChange({ currency: value as Currency[] })
  }

  return (
    <Box sx={{ minWidth: 120 }}>
      <FormControl fullWidth>
        <InputLabel>{t('filters.currency')}</InputLabel>
        <Select
          {...getTestId(dataTestId)}
          multiple
          value={currency}
          onChange={handleChange}
          input={<OutlinedInput label={t('filters.currency')} />}
          renderValue={() => (
            <Typography
              variant='body2'
              color='text.secondary'
              noWrap
              sx={{
                width: '100%',
                px: 1.75,
              }}
            >
              {currency.map(curr => getCurrencyTicker(curr)).join(', ')}
            </Typography>
          )}
        >
          {currencyOptions.map(curr => (
            <MenuItem key={curr} value={curr}>
              <Checkbox checked={currency?.includes(curr)} />
              <ListItemText primary={getCurrencyTicker(curr)} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  )
}
