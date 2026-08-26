import { useCallback, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { SplitView } from 'src/components/Views/SplitView'
import { LocalStorageKeys } from 'src/modules/localStorage/config'
import { useLocalStorage } from 'src/modules/localStorage/useLocalStorage'
import { CollectionsTable } from 'src/features/collections/CollectionsTable'
import { CollectionOffersTable } from 'src/features/offers/collectionOffers/CollectionOffersTable'
import { CollectionEntityPreview } from 'src/features/collections/CollectionEntityPreview'
import { useAllWhitelistedCollections } from 'src/services/hooks/collection/useAllWhitelistedCollections'
import { CollectionsTableRow } from 'src/features/collections/useCollectionsTableState'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { LendPageTabs } from './LendPageTabs'

export function CollectionsPage() {
  const { t } = useTranslation()
  const [splitPercentage, setSplitPercentage] = useLocalStorage(LocalStorageKeys.Splits.LoansSplit)
  const [selectedCollection, setSelectedCollection] = useState<CollectionsTableRow | null>(null)
  // Pre-fetch all collections for dropdown filter
  useAllWhitelistedCollections()

  const handleClose = useCallback(() => {
    setSelectedCollection(null)
  }, [])

  return (
    <>
      <Helmet>
        <title>{t('page-titles.collection-offers')}</title>
      </Helmet>
      <SplitView
        splitPercentage={splitPercentage}
        setSplitPercentage={setSplitPercentage}
        leftHeader={<LendPageTabs />}
        leftContent={<CollectionsTable onViewOffers={setSelectedCollection} selectedCollection={selectedCollection} />}
        rightHeader={selectedCollection && <CollectionEntityPreview collection={selectedCollection} />}
        rightContent={selectedCollection
          ? <CollectionOffersTable collection={selectedCollection} />
          : null}
        closeRightPanel={handleClose}
      />
    </>
  )
}
