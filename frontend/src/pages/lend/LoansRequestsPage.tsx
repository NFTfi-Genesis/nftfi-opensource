import { useState, useCallback, useMemo } from 'react'
import { Helmet } from 'react-helmet-async'
import { ListingsTable, ListingsTableRow } from 'src/features/listings/listingsTable/ListingsTable'
import { LendListingEntityPreview } from 'src/features/listings/LendListingEntityPreview'
import { LenderOffersTable } from 'src/features/offers/lendOffers/LenderOffersTable'
import { SplitView } from 'src/components/Views/SplitView'
import { LocalStorageKeys } from 'src/modules/localStorage/config'
import { useLocalStorage } from 'src/modules/localStorage/useLocalStorage'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { useModals } from 'src/modules/modals/useModals'
import { Modals } from 'src/modules/modals/Modals'
import { useRequireWallet } from 'src/hooks/useRequireWallet'
import { useWallet } from 'src/modules/wallet/useWallet'
import { getTestId } from 'src/utils/testing'
import { LendPageTabs } from './LendPageTabs'

export function LoansRequestsPage() {
  const { t } = useTranslation()
  const { walletAddress } = useWallet()
  const [splitPercentage, setSplitPercentage] = useLocalStorage(LocalStorageKeys.Splits.ListingsSplit)
  const [listingSelected, setListingSelected] = useState<ListingsTableRow | null>(null)
  const { open: openMakeAssetOfferModal } = useModals(Modals.MakeAssetOffer)
  const { open: openMakeCollectionOfferModal } = useModals(Modals.MakeCollectionOffer)
  const requireWallet = useRequireWallet()

  // TODO: We should add an areAddressesEqual utility and update all places that do such comparisons to use it, instead of using toLowerCase()
  const isBorrower = useMemo(() => walletAddress?.toLowerCase() === listingSelected?.borrower.toLowerCase(), [walletAddress, listingSelected])

  // Listings Actions
  const handleViewOffers = useCallback((row: ListingsTableRow) => {
    setListingSelected(row)
  }, [])

  const handleMakeOffer = useCallback((row: ListingsTableRow) => {
    requireWallet(() => {
      openMakeAssetOfferModal({ nft: row.nft, borrower: row.borrower })
    })
  }, [requireWallet, openMakeAssetOfferModal])

  const handleMakeCollectionOffer = useCallback((row: ListingsTableRow) => {
    requireWallet(() => {
      openMakeCollectionOfferModal({ collection: row.nft.collection })
    })
  }, [requireWallet, openMakeCollectionOfferModal])

  return (
    <>
      <Helmet>
        <title>{t('page-titles.loan-requests')}</title>
      </Helmet>
      <SplitView
        splitPercentage={splitPercentage}
        setSplitPercentage={setSplitPercentage}

        leftHeader={<LendPageTabs />}
        leftContent={
          <ListingsTable
            onRowClick={row => setListingSelected(row)}
            selectedRow={listingSelected}
            onViewOffers={handleViewOffers}
          />
        }

        rightHeader={listingSelected && (
          <LendListingEntityPreview
            listing={listingSelected}
            prioritisedActions={
              isBorrower
                ? null
                : [
                  { label: t('lend.make-offer'), onClick: () => handleMakeOffer(listingSelected), ...getTestId('lend.make-offer') },
                  { label: t('lend.make-collection-offer'), onClick: () => handleMakeCollectionOffer(listingSelected), ...getTestId('lend.make-collection-offer') },
                ]
            }
          />
        )}
        rightContent={
          listingSelected
            ? <LenderOffersTable nft={listingSelected.nft} />
            : null
        }
        leftMinWidthPct={20}
        rightMinWidthPct={40}
        closeRightPanel={() => setListingSelected(null)}
      />
    </>
  )
}
