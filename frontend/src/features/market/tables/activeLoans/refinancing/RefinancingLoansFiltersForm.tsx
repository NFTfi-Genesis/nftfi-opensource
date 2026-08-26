import { memo } from 'react'
import { Autocomplete, Stack, TextField } from '@mui/material'
import { FormElementLabel } from 'src/components/Forms/FormElementLabel'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { getTestId } from 'src/utils/testing'
import { CurrencySelect } from 'src/components/Select/CurrencySelect'
import { DueSelect } from 'src/components/Select/DueSelect'
import { WalletAddressesInput } from 'src/components/Forms/WalletAddressesInput'
import { useAllActiveCollections } from 'src/services/hooks/collection/useAllActiveCollections'
import { ProtocolAutocomplete } from 'src/components/Autocomplete/ProtocolAutocomplete'
import { RefinancingLoansFilters, refiSupportedProtocols, UpdateRefinancingLoansFilter } from './useRefinancingLoansTableState'

export type RefinancingLoansFiltersFormProps = {
  filters: RefinancingLoansFilters
  updateFilter: UpdateRefinancingLoansFilter
}

type CollectionOption = RefinancingLoansFilters['collections'][number]

export const RefinancingLoansFiltersForm = memo(function RefinancingLoansFiltersForm({ filters, updateFilter }: RefinancingLoansFiltersFormProps) {
  const { t } = useTranslation()
  const { data: collectionOptions } = useAllActiveCollections({
    filters: { protocol: filters.protocol },
  })

  return (
    <Stack gap={2}>
      <Stack>
        <FormElementLabel label={t('filters.collection')} />
        <Autocomplete<CollectionOption, true>
          multiple
          options={(collectionOptions || []) as unknown as CollectionOption[]}
          value={filters.collections}
          onChange={(_, values) => updateFilter('collections', values)}
          getOptionLabel={option => option.info.name}
          isOptionEqualToValue={(option, value) => option.info.name === value.info.name}
          renderInput={params => (
            <TextField
              {...params}
              placeholder={
                filters.collections.length === 0
                  ? t('filters.select-collection')
                  : ''
              }
            />
          )}
        />
      </Stack>
      <ProtocolAutocomplete
        onChange={values => updateFilter('protocol', values.protocol)}
        protocol={filters.protocol}
        allowedProtocols={refiSupportedProtocols}
        {...getTestId('dashboard.filters.protocol')}
      />
      <CurrencySelect
        onChange={values => updateFilter('currency', values.currency)}
        currency={filters.currency}
        {...getTestId('dashboard.filters.currency')}
      />
      <DueSelect onChange={values => updateFilter('dueWithin', values.dueWithin)} due={filters.dueWithin} {...getTestId('dashboard.filters.dueIn')} />
      <WalletAddressesInput
        label={t('filters.wallet')}
        value={filters.wallets || []}
        onChange={values => updateFilter('wallets', values)}
      />
    </Stack>
  )
})
