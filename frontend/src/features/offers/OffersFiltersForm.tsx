import { memo, useMemo } from 'react'
import { Stack } from '@mui/material'
import { RangeSlider } from 'src/components/Forms/RangeSlider'
import { ToggleGroupInput } from 'src/components/Forms/ToggleGroupInput'
import { SwitchInput } from 'src/components/Forms/SwitchInput'
import { ToggleGroupWithCustomIntegerInput } from 'src/components/Forms/ToggleGroupWithCustomIntegerInput'
import { WalletAddressesInput } from 'src/components/Forms/WalletAddressesInput'
import { FormElementLabel } from 'src/components/Forms/FormElementLabel'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { currencyOptions, getCurrencyOptionsDisplayText, getIsProratedOptionsDisplayText, isProratedOptions } from 'src/utils/terms'
import { Offer } from 'src/entities/domain/Offer'
import { getOffersMinMax } from 'src/utils/offers'
import {
  offerDurationPresetOptions,
  OffersFilters as OffersFiltersState,
  UpdateOffersFilter,
} from './useOffersTablesState'

export type OffersFiltersFormProps = {
  filtersState: OffersFiltersState
  filterUpdate: UpdateOffersFilter
  offers: Offer[]
}

export const OffersFiltersForm = memo(function OffersFiltersForm({
  filtersState,
  filterUpdate,
  offers,
}: OffersFiltersFormProps) {
  const { t } = useTranslation()

  const maxAprSliderBounds = useMemo(() => {
    return getOffersMinMax('apr', offers, 0)
  }, [offers])

  const handleAprChange = (value: number | [number, number])=> {
    if (typeof value === 'number') {
      filterUpdate('maxApr', value)
    }
  }

  return (
    <Stack gap={1}>
      <Stack gap={2} mt={1}>
        <ToggleGroupInput
          name='loan-type'
          label={t('filters.loan-type')}
          value={filtersState.isProRated}
          onChange={val => filterUpdate('isProRated', val)}
          options={isProratedOptions}
          formatOption={option => getIsProratedOptionsDisplayText(option, t)}
        />

        <RangeSlider
          label={t('filters.max-apr')}
          value={filtersState.maxApr}
          onChange={handleAprChange}
          min={maxAprSliderBounds.min}
          max={maxAprSliderBounds.max}
          formatLabel={val => `≤${val}%`}
          disabled={offers.length === 0}
        />
      </Stack>

      <SwitchInput
        label={t('filters.without-origination-fee')}
        value={filtersState.withoutOriginationFee}
        onChange={val => filterUpdate('withoutOriginationFee', val)}
      />

      <ToggleGroupWithCustomIntegerInput
        name='duration'
        label={t('filters.min-duration-days')}
        value={filtersState.duration}
        onChange={val => filterUpdate('duration', val)}
        options={offerDurationPresetOptions}
      />

      <ToggleGroupInput
        name='currency'
        label={t('filters.currency')}
        value={filtersState.currency}
        onChange={val => filterUpdate('currency', val)}
        options={currencyOptions}
        formatOption={option => getCurrencyOptionsDisplayText(option, t)}
      />

      <Stack>
        <FormElementLabel label={t('filters.lender')} />
        <WalletAddressesInput
          value={filtersState.lenderAddresses}
          onChange={val => filterUpdate('lenderAddresses', val)}
        />
      </Stack>
    </Stack>
  )
})
