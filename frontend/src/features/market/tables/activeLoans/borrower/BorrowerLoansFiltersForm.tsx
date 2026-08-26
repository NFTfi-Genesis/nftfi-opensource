import { memo } from 'react'
import { Stack, FormControlLabel, Switch } from '@mui/material'
import { ProtocolAutocomplete } from 'src/components/Autocomplete/ProtocolAutocomplete'
import { BorrowerCollectionsAutocomplete } from 'src/components/Autocomplete/BorrowerCollectionsAutocomplete'
import { getTestId } from 'src/utils/testing'
import { CurrencySelect } from 'src/components/Select/CurrencySelect'
import { DueSelect } from 'src/components/Select/DueSelect'
import { Protocol } from 'src/entities/domain/Protocol'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { BorrowerLoansFilters, UpdateBorrowerLoansFilter } from './useBorrowerLoansTableState'

const ALL_PROTOCOLS: Protocol[] = [Protocol.Nftfi, Protocol.Arcade, Protocol.Blur, Protocol.Gondi]

export type BorrowerLoansFiltersFormProps = {
  filters: BorrowerLoansFilters
  updateFilter: UpdateBorrowerLoansFilter
}

export const BorrowerLoansFiltersForm = memo(function BorrowerLoansFiltersForm({ filters, updateFilter }: BorrowerLoansFiltersFormProps) {
  const { t } = useTranslation()

  // When onlyNftfi: narrow collections autocomplete to NFTfi. Otherwise let the BE
  // default to all v1-supported protocols (passing `undefined`) so we don't have to
  // mirror the supported set client-side just to avoid a 422.
  const autocompleteProtocols = filters.onlyNftfi
    ? [Protocol.Nftfi]
    : (filters.protocol.length > 0 ? filters.protocol : undefined)

  return (
    <Stack gap={2}>
      <FormControlLabel
        control={
          <Switch
            checked={filters.onlyNftfi}
            onChange={(_, checked) => updateFilter('onlyNftfi', checked)}
            {...getTestId('dashboard.filters.onlyNftfi')}
          />
        }
        label={t('borrow.filters.show-only-nftfi')}
      />
      <BorrowerCollectionsAutocomplete
        borrower={filters.borrower}
        protocols={autocompleteProtocols}
        value={filters.collections}
        onChange={collections => updateFilter('collections', collections)}
        {...getTestId('dashboard.filters.collection')}
      />
      {!filters.onlyNftfi && (
        <ProtocolAutocomplete
          onChange={values => updateFilter('protocol', values.protocol)}
          protocol={filters.protocol}
          {...getTestId('dashboard.filters.protocol')}
          allowedProtocols={ALL_PROTOCOLS}
        />
      )}
      <CurrencySelect
        onChange={values => updateFilter('currency', values.currency)}
        currency={filters.currency}
        {...getTestId('dashboard.filters.currency')}
      />
      <DueSelect onChange={values => updateFilter('dueWithin', values.dueWithin)} due={filters.dueWithin} {...getTestId('dashboard.filters.dueIn')} />
    </Stack>
  )
})
