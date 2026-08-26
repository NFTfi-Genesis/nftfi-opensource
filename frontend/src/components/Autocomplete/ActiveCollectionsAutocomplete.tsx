import { Stack, Typography, Box, Checkbox, TextField } from '@mui/material'
import { Autocomplete } from 'src/components/Autocomplete/Autocomplete'
import { AsyncPicture } from 'src/components/AsyncPicture'
import { formatAmount } from 'src/utils/amounts'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { formatPercentage } from 'src/utils/numbers'
import { Currency } from 'src/entities/domain/Currency'
import { getTestId } from 'src/utils/testing'
import { Percentage } from 'src/entities/base/Percentage'
import { Amount } from 'src/entities/base/Amount'
import { CollectionId } from 'src/entities/domain/Collection'
import { GetActiveCollectionsParams } from 'src/services/fetchers/collection/getActiveCollections'
import { useAllActiveCollections } from 'src/services/hooks/collection/useAllActiveCollections'

export type CollectionOption = {
  value: CollectionId
  label: string
  imageUri?: string
  totalValue?: Amount
  collectionsTotalValue?: Amount
}

export type ActiveCollectionsAutocompleteProps = {
  onChange: (params: { collectionIds: CollectionId[] }) => void
  collectionIds?: CollectionId[]
  'data-test-id'?: string
  filters: GetActiveCollectionsParams['filters']
}

export function ActiveCollectionsAutocomplete({
  onChange,
  collectionIds = [],
  'data-test-id': dataTestId = 'project',
  filters,
}: ActiveCollectionsAutocompleteProps) {
  const { t } = useTranslation()

  const { data: collections, isLoading } = useAllActiveCollections({ filters })

  const projectOptions: CollectionOption[] = (collections ?? []).map(collection => ({
    value: collection.id,
    label: collection.info.name,
    imageUri: collection.info.imageUri,
    totalValue: collection.totalValue,
    collectionsTotalValue: collection.collectionsTotalValue,
  }))

  return (
    <Autocomplete<CollectionOption>
      {...getTestId(dataTestId)}
      options={projectOptions}
      value={projectOptions.filter(option => collectionIds.includes(option.value))}
      loading={isLoading}
      disableClearable={true}
      disableCloseOnSelect={true}
      readOnly={isLoading}
      onChange={(_, newValue) =>
        onChange({ collectionIds: (newValue as CollectionOption[])?.map(v => v.value) })
      }
      label={t('filters.collection')}
      placeholder={t('filters.select-collection')}
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
          label={t('filters.collection')}
          placeholder={
            collectionIds.length === 0
              ? t('filters.select-collection')
              : ''
          }
        />
      )}
      renderOption={(props, option) => {
        const percentage
          = option.collectionsTotalValue !== undefined
          && option.collectionsTotalValue > 0
            ? ((option.totalValue ?? 0) / option.collectionsTotalValue) * 100 as Percentage
            : 0 as Percentage
        const { key, ...optionProps } = props

        return (
          <Box component='li' key={key} {...optionProps} height={60}>
            <Stack direction='row' spacing={1} alignItems='center' width='100%'>
              <Checkbox
                checked={collectionIds.includes(option.value)}
                size='small'
                sx={{ p: 0 }}
              />
              <Stack flexGrow={1} minWidth={0}>
                <Stack direction='row' spacing={1.2}>
                  {option.imageUri && (
                    <AsyncPicture
                      src={option.imageUri}
                      alt={option.label}
                      size={48}
                      sx={{ borderRadius: 1.5, minWidth: 48 }}
                    />
                  )}
                  <Stack width='100%' minWidth={0}>
                    <Typography fontWeight='semiBold' noWrap>
                      {option.label}
                    </Typography>
                    <Stack direction='row' justifyContent='space-between'>
                      {option.totalValue !== undefined && (
                        <Typography variant='body2' color='grey.500' noWrap>
                          ${formatAmount(option.totalValue, Currency.USD)}
                        </Typography>
                      )}
                      <Typography variant='subtitle2' color='grey.50' noWrap>
                        {formatPercentage(percentage)}%
                      </Typography>
                    </Stack>
                  </Stack>
                </Stack>
              </Stack>
            </Stack>
          </Box>
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
