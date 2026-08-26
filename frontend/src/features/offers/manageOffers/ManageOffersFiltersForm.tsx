import { memo, useMemo } from 'react'
import { Autocomplete, Stack, TextField } from '@mui/material'
import { RangeSlider } from 'src/components/Forms/RangeSlider'
import { ToggleGroupInput } from 'src/components/Forms/ToggleGroupInput'
import { SwitchInput } from 'src/components/Forms/SwitchInput'
import { ToggleGroupWithCustomIntegerInput } from 'src/components/Forms/ToggleGroupWithCustomIntegerInput'
import { WalletAddressesInput } from 'src/components/Forms/WalletAddressesInput'
import { FormElementLabel } from 'src/components/Forms/FormElementLabel'
import { useTranslation } from 'src/modules/translation/useTranslation'
import {
  currencyOptions,
  getCurrencyOptionsDisplayText,
  getIsProratedOptionsDisplayText,
  isProratedOptions,
} from 'src/utils/terms'
import { formatAmount } from 'src/utils/amounts'
import { Amount } from 'src/entities/base/Amount'
import { Currency } from 'src/entities/domain/Currency'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { AssetOfferExtended, CollectionOfferExtended, ContractOfferExtended } from 'src/entities/app/OfferExtended'
import { OfferValidated } from 'src/entities/app/OfferValidated'
import { getOffersMinMax, isAssetOffer, isCollectionOffer } from 'src/utils/offers'
import { CollectionId } from 'src/entities/domain/Collection'
import { useFxRate } from 'src/services/hooks/ethereum/useFxRate'
import { ManageOffersFilters } from './useManageOffersTableState'

const offerDurationPresetOptions = [7, 14, 30, 60, 90]

export type UpdateManageOffersFilter = <K extends keyof ManageOffersFilters>(
  key: K,
  value: ManageOffersFilters[K]
) => void

export type ManageOffersFiltersFormProps = {
  filtersState: ManageOffersFilters
  updateFilter: UpdateManageOffersFilter
  rows: Array<
    | AssetOfferExtended<OfferValidated>
    | CollectionOfferExtended<OfferValidated>
    | ContractOfferExtended<OfferValidated>
  >
}

export const ManageOffersFiltersForm = memo(function ManageOffersFiltersForm({
  filtersState,
  updateFilter,
  rows,
}: ManageOffersFiltersFormProps) {
  const { t } = useTranslation()
  const { data: fxRate } = useFxRate()

  const principalSliderBounds = useMemo(() => {
    return getOffersMinMax('principal', rows, fxRate ?? 3000)
  }, [rows, fxRate])

  const principalSliderValue = useMemo<[number, number]>(() => {
    const [minVal, maxVal] = filtersState.principalRange
    const min = Math.max(principalSliderBounds.min, minVal)
    const max = Math.min(principalSliderBounds.max, maxVal)

    return [Math.min(min, max), Math.max(min, max)]
  }, [filtersState.principalRange, principalSliderBounds.max, principalSliderBounds.min])

  const principalSliderStep = principalSliderBounds.max / 100

  const formatPrincipalLabel = (val: number) => {
    return `$${formatAmount(val as Amount, Currency.USD, {
      compactThreshold: 5,
    })}`
  }

  const handlePrincipalRangeChange = (value: number | [number, number]) => {
    if (Array.isArray(value)) {
      updateFilter('principalRange', value)
    }
  }

  const handleAprChange = (value: number | [number, number]) => {
    if (typeof value === 'number') {
      updateFilter('maxApr', value)
    }
  }

  const collectionOptions: CollectionExtended<CollectionInfo>[] = useMemo(() => {
    if (!rows || rows.length === 0) return []
    const uniqueCollections = rows.reduce((acc, row) => {
      if (isAssetOffer(row)) {
        acc[row.nft.collection.id] = row.nft.collection
      }
      if (isCollectionOffer(row)) {
        acc[row.collection.id] = row.collection
      }
      return acc
    }, {} as Record<CollectionId, CollectionExtended<CollectionInfo>>)
    return Object.values(uniqueCollections)
  }, [rows])

  const selectedCollections = useMemo(() => {
    if (!filtersState.collections || filtersState.collections.length === 0) return []
    return filtersState.collections.filter(collection => collectionOptions.find(option => option.id === collection.id))
  }, [filtersState.collections, collectionOptions])

  return (
    <Stack gap={1}>
      <Stack>
        <FormElementLabel label={t('filters.collection')} />
        <Autocomplete<CollectionExtended<CollectionInfo>, true>
          multiple
          options={collectionOptions}
          value={selectedCollections}
          onChange={(_, values) => updateFilter('collections', values)}
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
      <SwitchInput
        label={t('navigation.collection-offers')}
        value={filtersState.showCollectionOffersOnly}
        onChange={val => updateFilter('showCollectionOffersOnly', val)}
      />

      <ToggleGroupInput
        name='currency'
        label={t('filters.currency')}
        value={filtersState.currency}
        onChange={val => updateFilter('currency', val)}
        options={currencyOptions}
        formatOption={option => getCurrencyOptionsDisplayText(option, t)}
      />

      <RangeSlider
        label={t('custom-table-columns.principal')}
        value={principalSliderValue}
        onChange={handlePrincipalRangeChange}
        min={principalSliderBounds.min}
        max={principalSliderBounds.max}
        step={principalSliderStep}
        formatLabel={formatPrincipalLabel}
        disabled={rows.length === 0}
      />

      <ToggleGroupInput
        name='loan-type'
        label={t('filters.loan-type')}
        value={filtersState.isProRated}
        onChange={val => updateFilter('isProRated', val)}
        options={isProratedOptions}
        formatOption={option => getIsProratedOptionsDisplayText(option, t)}
      />

      <RangeSlider
        label={t('filters.max-apr')}
        value={filtersState.maxApr}
        onChange={handleAprChange}
        formatLabel={val => `≤${val}%`}
      />

      <SwitchInput
        label={t('filters.without-origination-fee')}
        value={filtersState.withoutOriginationFee}
        onChange={val => updateFilter('withoutOriginationFee', val)}
      />

      <SwitchInput
        label={t('custom-table-columns.offer-status-active')}
        value={filtersState.activeLoansOnly}
        onChange={val => updateFilter('activeLoansOnly', val)}
      />

      <ToggleGroupWithCustomIntegerInput
        label={t('filters.min-duration-days')}
        name='duration'
        value={filtersState.duration}
        onChange={val => updateFilter('duration', val)}
        options={offerDurationPresetOptions}
      />

      <Stack>
        <FormElementLabel label={t('filters.borrower')} />
        <WalletAddressesInput
          value={filtersState.borrowerAddress
            ? [filtersState.borrowerAddress]
            : []}
          onChange={val => updateFilter('borrowerAddress', val[val.length - 1] || null)}
        />
      </Stack>
    </Stack>
  )
})
