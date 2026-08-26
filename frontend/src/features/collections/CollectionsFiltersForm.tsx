import { Autocomplete, Stack, TextField } from '@mui/material'
import { memo, useMemo } from 'react'
import { FormElementLabel } from 'src/components/Forms/FormElementLabel'
import { Amount } from 'src/entities/base/Amount'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { useAllWhitelistedCollections } from 'src/services/hooks/collection/useAllWhitelistedCollections'
import { CollectionsFilters, UpdateCollectionsFilter } from './useCollectionsTableState'

export type CollectionsFiltersFormProps = {
  filtersState: CollectionsFilters
  updateFilter: UpdateCollectionsFilter
}

type CollectionOption = CollectionsFilters['collections'][number]

function getIsDigitsOnly(value: string): boolean {
  return /^\d*$/.test(value)
}

function parseAmountInput(value: string): Amount | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  if (!getIsDigitsOnly(trimmed)) return null
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return parsed as Amount
}

export const CollectionsFiltersForm = memo(({ filtersState, updateFilter }: CollectionsFiltersFormProps) => {
  const { t } = useTranslation()
  const { data: collections, isLoading } = useAllWhitelistedCollections({
    revalidateOnMount: false,
  })

  const selectedCollections = useMemo<CollectionOption[]>(() => {
    if (filtersState.collections.length === 0) return []
    return filtersState.collections.filter(collection => {
      return (collections ?? []).find(option => option.id === collection.id)
    })
  }, [filtersState.collections, collections])

  const collectionOptions = useMemo(() => {
    return getUniqueCollectionOptions(collections ?? [])
  }, [collections])

  return (
    <Stack gap={1.5}>
      <Stack>
        <FormElementLabel label={t('filters.collection')} />
        <Autocomplete<CollectionOption, true>
          multiple
          options={collectionOptions}
          value={selectedCollections}
          onChange={(_, values) => updateFilter('collections', values)}
          getOptionLabel={option => option.info.name}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderInput={params => (
            <TextField
              name='collections'
              {...params}
              placeholder={
                filtersState.collections.length === 0
                  ? t('filters.select-collection')
                  : ''
              }
              slotProps={{
                input: {
                  ...params.InputProps,
                  'aria-busy': isLoading,
                },
              }}
            />
          )}
        />
      </Stack>

      <Stack gap={1}>
        <FormElementLabel label={t('collections.filters-form.volume')} />
        <Stack direction='row' gap={1}>
          <TextField
            type='text'
            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
            placeholder={t('collections.filters-form.min')}
            value={
              filtersState.totalLoanAmount.min !== null
                ? String(filtersState.totalLoanAmount.min)
                : ''
            }
            onChange={e => {
              if (!getIsDigitsOnly(e.target.value)) return
              const min = parseAmountInput(e.target.value)
              updateFilter('totalLoanAmount', { ...filtersState.totalLoanAmount, min })
            }}
            fullWidth
          />
          <TextField
            type='text'
            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
            placeholder={t('collections.filters-form.max')}
            value={
              filtersState.totalLoanAmount.max !== null
                ? String(filtersState.totalLoanAmount.max)
                : ''
            }
            onChange={e => {
              if (!getIsDigitsOnly(e.target.value)) return
              const max = parseAmountInput(e.target.value)
              updateFilter('totalLoanAmount', { ...filtersState.totalLoanAmount, max })
            }}
            fullWidth
          />
        </Stack>
      </Stack>

      <Stack gap={1}>
        <FormElementLabel label={t('collections.filters-form.avg-loan-size')} />
        <Stack direction='row' gap={1}>
          <TextField
            type='text'
            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
            placeholder={t('collections.filters-form.min')}
            value={
              filtersState.avgLoanAmount.min !== null
                ? String(filtersState.avgLoanAmount.min)
                : ''
            }
            onChange={e => {
              if (!getIsDigitsOnly(e.target.value)) return
              const min = parseAmountInput(e.target.value)
              updateFilter('avgLoanAmount', { ...filtersState.avgLoanAmount, min })
            }}
            fullWidth
          />
          <TextField
            type='text'
            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
            placeholder={t('collections.filters-form.max')}
            value={
              filtersState.avgLoanAmount.max !== null
                ? String(filtersState.avgLoanAmount.max)
                : ''
            }
            onChange={e => {
              if (!getIsDigitsOnly(e.target.value)) return
              const max = parseAmountInput(e.target.value)
              updateFilter('avgLoanAmount', { ...filtersState.avgLoanAmount, max })
            }}
            fullWidth
          />
        </Stack>
      </Stack>
    </Stack>
  )
})

// BE sometimes has duplicate collections, so we need to filter them out
// Otherwise, the autocomplete is flaky
function getUniqueCollectionOptions(collections: CollectionOption[]): CollectionOption[] {
  return collections.filter((collection, index, self) =>
    index === self.findIndex(t => t.info.name === collection.info.name)
  )
}
