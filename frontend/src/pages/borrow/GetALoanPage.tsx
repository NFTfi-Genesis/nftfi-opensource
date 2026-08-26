import { memo, useState, useCallback } from 'react'
import { Helmet } from 'react-helmet-async'
import { SplitView } from 'src/components/Views/SplitView'
import { LocalStorageKeys } from 'src/modules/localStorage/config'
import { useLocalStorage } from 'src/modules/localStorage/useLocalStorage'
import { useWallet } from 'src/modules/wallet/useWallet'
import { WalletNftsTable, WalletNftsTableRow } from 'src/features/nfts/walletNfts/WalletNftsTable'
import { GetALoanOffersTable } from 'src/features/offers/getALoanOffers/GetALoanOffersTable'
import { EntityPreview } from 'src/components/EntityPreview'
import { ConnectWalletWarning } from 'src/components/ConnectWallet/ConnectWalletWarning'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { useDrawers } from 'src/modules/drawers/DrawersProvider'
import { DrawerType } from 'src/modules/drawers/DrawerType'
import { ActionsDrawer } from 'src/components/ActionsDrawer'
import { ManageListing, ManageListingMode, ManageListingFormData } from 'src/features/listings/ManageListing'
import { useCreateListing } from 'src/services/hooks/listing/useCreateListing'
import { useUpdateListing } from 'src/services/hooks/listing/useUpdateListing'
import { useDeleteListing } from 'src/services/hooks/listing/useDeleteListing'
import { useWalletNftsWithListings } from 'src/services/hooks/nft/useWalletNftsWithListings'
import { ListingEntityPreview } from 'src/features/listings/ListingEntityPreview'
import { getTestId } from 'src/utils/testing'
import { BorrowPageTabs } from './BorrowPageTabs'

// Temporarily disabled: clicking a wallet asset no longer opens the offers split
// panel, and listing management (list / edit / unlist) is turned off here. Flip
// back to true to restore the offers panel + right-side listing actions (and
// re-enable the row actions column via ROW_ACTIONS_ENABLED in useWalletNftsColumns).
const OFFERS_SPLIT_ENABLED = false

export const GetALoanPage = memo(function GetALoanPage() {
  const { t } = useTranslation()
  const { isWalletAvailable, walletAddress } = useWallet()
  const { setDrawerOpen } = useDrawers()
  const [splitPercentage, setSplitPercentage] = useLocalStorage(LocalStorageKeys.Splits.GetALoanSplit)
  const [walletNftSelected, setWalletNftSelected] = useState<WalletNftsTableRow | null>(null)
  const [manageListingNft, setManageListingNft] = useState<WalletNftsTableRow | null>(null)
  const [manageListingMode, setManageListingMode] = useState<ManageListingMode>(ManageListingMode.List)
  const { send: createListing } = useCreateListing()
  const { send: updateListing } = useUpdateListing()
  const { send: deleteListing } = useDeleteListing()

  // Re-derive the selected row from the live data so listing edits/deletes
  // reflect immediately in the right panel (SWR dedupes with WalletNftsTable's call).
  const { data: walletNftsData } = useWalletNftsWithListings(walletAddress!)
  const liveWalletNftSelected = walletNftSelected && walletNftsData
    ? walletNftsData.find(n => n.address === walletNftSelected.address && n.id === walletNftSelected.id) ?? walletNftSelected
    : walletNftSelected

  // Drawer handlers
  const handleOpenManageListing = useCallback((row: WalletNftsTableRow, mode: ManageListingMode) => {
    setManageListingNft(row)
    setManageListingMode(mode)
    setDrawerOpen(DrawerType.ManageListing, true)
  }, [setDrawerOpen])

  const handleCloseManageListing = useCallback(() => {
    setDrawerOpen(DrawerType.ManageListing, false)
    setManageListingNft(null)
  }, [setDrawerOpen])

  const handleManageListingSubmit = useCallback(async (data: ManageListingFormData) => {
    if (!manageListingNft) return
    switch (manageListingMode) {
      case ManageListingMode.List:
        await createListing({
          nft: {
            id: manageListingNft.id,
            address: manageListingNft.address,
          },
          desiredTerms: {
            duration: data.duration,
            currency: data.currency,
            isProRated: data.isProRated,
            preference: data.preference,
          },
          listedDate: new Date(),
        })
        break
      case ManageListingMode.Edit:
        if (manageListingNft.listing) {
          await updateListing({
            ...manageListingNft.listing,
            desiredTerms: {
              duration: data.duration,
              currency: data.currency,
              isProRated: data.isProRated,
              preference: data.preference,
            },
          })
        }
        break
      case ManageListingMode.Unlist:
        if (manageListingNft.listing) {
          await deleteListing(manageListingNft.listing)
        }
        break
    }
  }, [createListing, updateListing, deleteListing, manageListingNft, manageListingMode])

  // NFT Actions
  const handleList = useCallback((row: WalletNftsTableRow) => {
    handleOpenManageListing(row, ManageListingMode.List)
  }, [handleOpenManageListing])

  const handleEdit = useCallback((row: WalletNftsTableRow) => {
    handleOpenManageListing(row, ManageListingMode.Edit)
  }, [handleOpenManageListing])

  const handleUnlist = useCallback((row: WalletNftsTableRow) => {
    handleOpenManageListing(row, ManageListingMode.Unlist)
  }, [handleOpenManageListing])

  const handleViewOffers = useCallback((row: WalletNftsTableRow) => {
    setWalletNftSelected(row)
  }, [])

  if (!isWalletAvailable) {
    return (
      <SplitView
        splitPercentage={splitPercentage}
        setSplitPercentage={setSplitPercentage}
        leftHeader={<BorrowPageTabs />}
        leftContent={<ConnectWalletWarning />}
        rightHeader={null}
        rightContent={null}
        closeRightPanel={() => {}}
      />
    )
  }

  return (
    <>
      <Helmet>
        <title>{t('page-titles.get-a-loan')}</title>
      </Helmet>
      <SplitView
        splitPercentage={splitPercentage}
        setSplitPercentage={setSplitPercentage}

        leftHeader={<BorrowPageTabs />}
        leftContent={
          <WalletNftsTable
            onList={handleList}
            onEdit={handleEdit}
            onUnlist={handleUnlist}
            onViewOffers={handleViewOffers}
            onRowClick={OFFERS_SPLIT_ENABLED ? setWalletNftSelected : undefined}
            selectedRow={walletNftSelected}
          />
        }
        leftMinWidthPct={20}

        rightHeader={OFFERS_SPLIT_ENABLED && liveWalletNftSelected && (
          liveWalletNftSelected.listing
            ? <ListingEntityPreview listing={{ ...liveWalletNftSelected.listing, nft: liveWalletNftSelected }} />
            : <EntityPreview
              nftDetails={{ nft: liveWalletNftSelected }}
              prioritisedActions={[{ label: t('borrow.list-asset'), onClick: () => handleList(liveWalletNftSelected), ...getTestId('borrow.list-asset') }]}
            />
        )}
        rightContent={OFFERS_SPLIT_ENABLED && liveWalletNftSelected
          && <GetALoanOffersTable nft={liveWalletNftSelected} selectedRow={liveWalletNftSelected} onList={handleList} onEdit={handleEdit} />
        }
        rightMinWidthPct={30}
        closeRightPanel={() => setWalletNftSelected(null)}
      />

      <ActionsDrawer
        title={manageListingMode === ManageListingMode.Unlist
          ? t('borrow.unlist-asset')
          : t('borrow.set-preferred-terms')}
        drawerType={DrawerType.ManageListing}
        width='320px'
      >
        {manageListingNft && (
          <ManageListing
            mode={manageListingMode}
            nft={manageListingNft}
            onClose={handleCloseManageListing}
            onSubmit={handleManageListingSubmit}
          />
        )}
      </ActionsDrawer>
    </>
  )
})
