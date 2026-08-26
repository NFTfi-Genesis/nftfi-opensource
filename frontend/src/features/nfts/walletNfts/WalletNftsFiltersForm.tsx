import { memo, useMemo } from 'react'
import { Stack, TextField } from '@mui/material'
import { ToggleGroupInput } from 'src/components/Forms/ToggleGroupInput'
import { FormElementLabel } from 'src/components/Forms/FormElementLabel'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { Autocomplete } from 'src/components/Autocomplete/Autocomplete'
import { getWalletNftsStatusDisplayText } from 'src/utils/listings'
import {
  WalletNftsStatusOptions,
  WalletNftsFilters,
  UpdateWalletNftsFilter,
} from './types'
import { WalletNftsTableRow } from './WalletNftsTable'

export type WalletNftsFiltersFormProps = {
  filtersState: WalletNftsFilters
  updateFilter: UpdateWalletNftsFilter
  rows: WalletNftsTableRow[] | undefined
}

type CollectionOption = {
  value: string
  label: string
}

const statusOptions = [
  WalletNftsStatusOptions.Any,
  WalletNftsStatusOptions.Listed,
  WalletNftsStatusOptions.Unlisted,
]

export const WalletNftsFiltersForm = memo(function WalletNftsFiltersForm({
  filtersState,
  updateFilter,
  rows,
}: WalletNftsFiltersFormProps) {
  const { t } = useTranslation()

  const collectionOptions: CollectionOption[] = useMemo(() => {
    if (!rows || rows.length === 0) return []
    const uniqueCollections = new Set(rows.map(row => row.collection.info.name))
    return Array.from(uniqueCollections).map(name => ({
      value: name,
      label: name,
    }))
  }, [rows])

  const selectedCollections = useMemo(() => {
    if (!filtersState.collection || filtersState.collection.length === 0) return []
    return collectionOptions.filter(opt => filtersState.collection.includes(opt.value))
  }, [filtersState.collection, collectionOptions])

  return (
    <Stack gap={1.5}>
      <Stack>
        <FormElementLabel label={t('filters.collection')} />
        <Autocomplete<CollectionOption>
          multiple
          options={collectionOptions}
          value={selectedCollections}
          onChange={(_, newValue) => {
            const values = Array.isArray(newValue)
              ? newValue.map(v => typeof v === 'object'
                ? v.value
                : v)
              : []
            updateFilter('collection', values)
          }}
          placeholder={t('filters.select-collection')}
          getOptionLabel={option => (typeof option === 'string'
            ? option
            : option.label)}
          isOptionEqualToValue={(option, value) => option.value === value.value}
          renderInput={params => (
            <TextField
              {...params}
              placeholder={
                filtersState.collection.length === 0
                  ? t('filters.select-collection')
                  : ''
              }
            />
          )}
        />
      </Stack>

      <ToggleGroupInput
        label='Status'
        name='status'
        value={filtersState.status}
        onChange={val => updateFilter('status', val)}
        options={statusOptions}
        formatOption={status => getWalletNftsStatusDisplayText(status, t)}
      />
    </Stack>
  )
})
