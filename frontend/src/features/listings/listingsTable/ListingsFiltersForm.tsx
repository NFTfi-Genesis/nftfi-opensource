import { useCallback, useMemo } from 'react'
import { Autocomplete, Stack, TextField } from '@mui/material'
import { WalletAddressesInput } from 'src/components/Forms/WalletAddressesInput'
import { ToggleGroupInput } from 'src/components/Forms/ToggleGroupInput'
import { FormElementLabel } from 'src/components/Forms/FormElementLabel'
import { Address } from 'src/entities/base/Address'
import { Currency } from 'src/entities/domain/Currency'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { getTestId } from 'src/utils/testing'
import type { ListingsFilters } from 'src/services/fetchers/listing/getListings'
import {
  currencyOptions,
  type CurrencyOptions,
  getCurrencyOptionsDisplayText,
} from 'src/utils/terms'
import { useAllWhitelistedCollections } from 'src/services/hooks/collection/useAllWhitelistedCollections'
import { CollectionsFilters } from 'src/features/collections/useCollectionsTableState'
import { Seconds } from 'src/entities/base/Seconds'
import { ToggleGroupWithCustomIntegerInput } from 'src/components/Forms/ToggleGroupWithCustomIntegerInput'
import { offerDurationPresetOptions } from 'src/features/offers/useOffersTablesState'
import type { UpdateListingsFilter } from './useListingsTableState'

type CollectionOption = CollectionsFilters['collections'][number]
interface ListingsFiltersFormProps {
  filtersState: ListingsFilters
  filterUpdate: UpdateListingsFilter
}

export function ListingsFiltersForm({
  filtersState,
  filterUpdate,
}: ListingsFiltersFormProps) {
  const { t } = useTranslation()

  const { data: collections } = useAllWhitelistedCollections( { cacheExpiration: 60 * 60 * 24 as Seconds })

  const selectedCollections = useMemo<CollectionOption[]>(() => {
    if (filtersState.collections.length === 0) return []
    return filtersState.collections.filter(collection => {
      return (collections ?? []).find(option => option.id === collection.id)
    })
  }, [filtersState.collections, collections])

  const collectionOptions = useMemo(() => {
    return getUniqueCollectionOptions(collections ?? [])
  }, [collections])

  const currencyValue: CurrencyOptions = !filtersState.currency || filtersState.currency === Currency.DAI
    ? null
    : filtersState.currency

  const handleBorrowerChange = useCallback(
    (addresses: Address[]) => {
      filterUpdate('borrower', addresses[0] ?? null)
    },
    [filterUpdate]
  )

  const handleCurrencyChange = useCallback(
    (val: CurrencyOptions) => {
      filterUpdate('currency', val)
    },
    [filterUpdate]
  )

  return (
    <Stack gap={2}>
      <Stack>
        <FormElementLabel label={t('filters.collection')} />
        <Autocomplete<CollectionOption, true>
          multiple
          options={collectionOptions}
          value={selectedCollections}
          onChange={(_, values) => filterUpdate('collections', values)}
          getOptionLabel={option => option.info.name}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderInput={params => (
            <TextField
              {...params}
              placeholder={
                filtersState.collections.length === 0
                  ? t('filters.select-collection')
                  : ''
              }
            />
          )}
        />
      </Stack>
      <ToggleGroupWithCustomIntegerInput
        name='duration'
        label={t('borrow.des-duration')}
        value={filtersState.duration}
        onChange={val => filterUpdate('duration', val)}
        options={offerDurationPresetOptions}
      />
      <ToggleGroupInput
        name='currency'
        label={t('borrow.des-currency')}
        value={currencyValue}
        onChange={handleCurrencyChange}
        options={currencyOptions}
        formatOption={option => getCurrencyOptionsDisplayText(option, t)}
        {...getTestId('listings.filters.currency')}
      />
      <Stack>
        <FormElementLabel label={t('filters.borrower')} />
        <WalletAddressesInput
          value={filtersState.borrower
            ? [filtersState.borrower]
            : []}
          onChange={handleBorrowerChange}
        />
      </Stack>
    </Stack>
  )
}

// BE sometimes has duplicate collections, so we need to filter them out
// Otherwise, the autocomplete is flaky
function getUniqueCollectionOptions(collections: CollectionOption[]): CollectionOption[] {
  return collections.filter((collection, index, self) =>
    index === self.findIndex(t => t.info.name === collection.info.name)
  )
}
