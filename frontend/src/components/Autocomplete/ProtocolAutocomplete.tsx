import { Stack, Checkbox, Typography, TextField } from '@mui/material'
import { Autocomplete } from 'src/components/Autocomplete/Autocomplete'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { getTestId } from 'src/utils/testing'
import { Protocol } from 'src/entities/domain/Protocol'
import { ProtocolDisplayNames, ProtocolLogos } from 'src/utils/protocols'

export interface ProtocolOption {
  value: Protocol
  label: string
  icon: React.ComponentType
}

// Metastreet, X2Y2, and Zharta are intentionally omitted: they aren't tracked in the new
// Postgres-backed analytics (MarketLoanProtocol enum on the API side only includes
// nftfi/arcade/blur/gondi), so filtering by them returns nothing useful.
const protocolOptions: ProtocolOption[] = [
  {
    value: Protocol.Arcade,
    label: ProtocolDisplayNames[Protocol.Arcade],
    icon: ProtocolLogos[Protocol.Arcade],
  },
  {
    value: Protocol.Blur,
    label: ProtocolDisplayNames[Protocol.Blur],
    icon: ProtocolLogos[Protocol.Blur],
  },
  {
    value: Protocol.Gondi,
    label: ProtocolDisplayNames[Protocol.Gondi],
    icon: ProtocolLogos[Protocol.Gondi],
  },
  {
    value: Protocol.Nftfi,
    label: ProtocolDisplayNames[Protocol.Nftfi],
    icon: ProtocolLogos[Protocol.Nftfi],
  },
]

interface ProtocolAutocompleteProps {
  onChange: (params: { protocol: Protocol[] }) => void
  protocol?: Protocol[]
  allowedProtocols?: Protocol[] | null
  'data-test-id'?: string
}

export function ProtocolAutocomplete({
  onChange,
  protocol = [],
  allowedProtocols,
  'data-test-id': dataTestId = 'protocol',
}: ProtocolAutocompleteProps) {
  const { t } = useTranslation()
  const allowedOptions = allowedProtocols
    ? protocolOptions.filter(option => allowedProtocols.includes(option.value))
    : protocolOptions
  return (
    <Autocomplete<ProtocolOption>
      {...getTestId(dataTestId)}
      options={allowedOptions}
      value={allowedOptions.filter(option => protocol.includes(option.value))}
      disableClearable={true}
      disableCloseOnSelect={true}
      onChange={(_, newValue) => {
        onChange({
          protocol: (newValue as ProtocolOption[])?.map(v => v.value),
        })
      }}
      label={t('filters.protocol')}
      placeholder={t('filters.select-protocol')}
      multiple
      getOptionLabel={option =>
        typeof option === 'string'
          ? option
          : option.label
      }
      isOptionEqualToValue={(option, value) => option.value === value.value}
      renderInput={params => (
        <TextField
          {...params}
          label={t('filters.protocol')}
          placeholder={
            protocol.length === 0
              ? t('filters.select-protocol')
              : ''
          }
        />
      )}
      renderOption={(props, option) => {
        const Icon = option.icon
        return (
          <li {...props} key={option.value}>
            <Stack direction='row' alignItems='center' spacing={1}>
              <Checkbox
                checked={protocol.includes(option.value)}
                size='small'
                sx={{ p: 0 }}
              />
              <Icon />
              <span>{option.label}</span>
            </Stack>
          </li>
        )
      }}
      renderTags={selected => (
        <Typography
          variant='body2'
          color='text.secondary'
          noWrap
          sx={{
            maxWidth: 'calc(100% - 50px)',
            px: 1.75,
            py: 0.75,
          }}
        >
          {selected.map(option => option.label).join(', ')}
        </Typography>
      )}
    />
  )
}
