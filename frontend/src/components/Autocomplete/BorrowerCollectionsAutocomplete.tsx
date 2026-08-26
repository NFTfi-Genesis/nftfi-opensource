import { Autocomplete, Stack, TextField } from '@mui/material'
import { FormElementLabel } from 'src/components/Forms/FormElementLabel'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { useBorrowerCollections } from 'src/services/hooks/collection/useBorrowerCollections'
import { Address } from 'src/entities/base/Address'
import { Protocol } from 'src/entities/domain/Protocol'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { getTestId } from 'src/utils/testing'

export type BorrowerCollectionsAutocompleteProps = {
  borrower: Address
  protocols?: Protocol[]
  value: CollectionExtended<CollectionInfo>[]
  onChange: (collections: CollectionExtended<CollectionInfo>[]) => void
  'data-test-id'?: string
}

type CollectionOption = CollectionExtended<CollectionInfo>

export function BorrowerCollectionsAutocomplete({
  borrower,
  protocols,
  value,
  onChange,
  'data-test-id': dataTestId = 'borrower-collections',
}: BorrowerCollectionsAutocompleteProps) {
  const { t } = useTranslation()
  const { data: collectionOptions } = useBorrowerCollections({ borrower, protocols })

  return (
    <Stack {...getTestId(dataTestId)}>
      <FormElementLabel label={t('filters.collection')} />
      <Autocomplete<CollectionOption, true>
        multiple
        options={(collectionOptions || []) as CollectionOption[]}
        value={value}
        onChange={(_, values) => onChange(values as CollectionOption[])}
        getOptionLabel={option => option.info.name}
        isOptionEqualToValue={(option, val) => option.id === val.id}
        renderInput={params => (
          <TextField
            {...params}
            placeholder={
              value.length === 0
                ? t('filters.select-collection')
                : ''
            }
          />
        )}
      />
    </Stack>
  )
}
