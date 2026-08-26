import { useMemo, useCallback } from 'react'
import { useColumns } from 'src/components/Tables/useColumns'
import { MultiActionButtonAction } from 'src/components/MultiActionButton/MultiActionButton'
import { ListingExtended } from 'src/entities/app/ListingExtended'
import { NftExtended } from 'src/entities/app/NftExtended'
import { NftInfo } from 'src/entities/app/NftInfo'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { getListingPreferenceOptionsDisplayText } from 'src/utils/listings'
import { getIsProratedOptionsDisplayText } from 'src/utils/terms'
import { getCurrencyTicker } from 'src/utils/currencies'
import { useModals } from 'src/modules/modals/useModals'
import { Modals } from 'src/modules/modals/Modals'
import { useRequireWallet } from 'src/hooks/useRequireWallet'
import { useWallet } from 'src/modules/wallet/useWallet'
import { getTestId } from 'src/utils/testing'

export type ListingsTableRow = ListingExtended<NftExtended<NftInfo | CollectionExtended<CollectionInfo>>>

export type UseListingsColumnsParams = {
  onViewOffers?: (row: ListingsTableRow) => void
}

export function useListingsColumns({
  onViewOffers,
}: UseListingsColumnsParams = {}) {
  const { t } = useTranslation()
  const { walletAddress } = useWallet()
  const { getColumn } = useColumns<ListingsTableRow>()
  const { open: openMakeAssetOfferModal } = useModals(Modals.MakeAssetOffer)
  const { open: openMakeCollectionOfferModal } = useModals(Modals.MakeCollectionOffer)
  const requireWallet = useRequireWallet()

  const getRowPrioritisedActions = useCallback((row: ListingsTableRow): MultiActionButtonAction[] => {
    const isBorrower = walletAddress?.toLowerCase() === row.borrower.toLowerCase()
    const actions: MultiActionButtonAction[] = []

    if (onViewOffers) {
      actions.push({ label: t('borrow.view-offers'), onClick: () => onViewOffers(row), ...getTestId('lend.view-offers') })
    }

    // Only show "Make Offer" if the current user is not the borrower
    if (!isBorrower) {
      actions.push({
        label: t('lend.make-offer'),
        onClick: () => requireWallet(() => {
          openMakeAssetOfferModal({ nft: row.nft, borrower: row.borrower })
        }),
        ...getTestId('lend.make-offer'),
      })
      actions.push({
        label: t('lend.make-collection-offer'),
        onClick: () => requireWallet(() => {
          openMakeCollectionOfferModal({ collection: row.nft.collection })
        }),
        ...getTestId('lend.make-collection-offer'),
      })
    }

    return actions
  }, [walletAddress, onViewOffers, openMakeAssetOfferModal, openMakeCollectionOfferModal, requireWallet, t])

  const columns = useMemo(() => [
    getColumn({
      columnName: 'assetInfoDashboard',
      headerTranslationKey: 'custom-table-columns.asset',
      getCellProps: row => ({
        nft: row.nft,
      }),
      overrides: {
        minWidth: 300,
        flex: 2,
        hideable: false,
      },
    }),
    getColumn({
      columnName: 'textWithSubtext',
      headerTranslationKey: 'borrow.des-currency',
      key: 'desiredCurrency',
      getCellProps: row => ({
        text: row.desiredTerms.currency
          ? getCurrencyTicker(row.desiredTerms.currency)
          : '-',
      }),
      overrides: {
        minWidth: 130,
      },
    }),
    getColumn({
      columnName: 'textWithSubtext',
      headerTranslationKey: 'borrow.des-loan-type',
      key: 'desiredLoan',
      getCellProps: row => ({
        text: getIsProratedOptionsDisplayText(row.desiredTerms.isProRated, t),
      }),
      overrides: {
        minWidth: 130,
      },
    }),
    getColumn({
      columnName: 'duration',
      headerTranslationKey: 'borrow.des-duration',
      getCellProps: row => ({
        amount: row.desiredTerms.duration,
      }),
      overrides: {
        minWidth: 120,
      },
    }),
    getColumn({
      columnName: 'textWithSubtext',
      headerTranslationKey: 'borrow.preference',
      key: 'preference',
      getCellProps: row => ({
        text: getListingPreferenceOptionsDisplayText(row.desiredTerms.preference, t),
        monoFont: true,
      }
      ),
      overrides: {
        minWidth: 150,
        headerAlign: 'right',
        align: 'right',
      },
    }),
    getColumn({
      columnName: 'relativeAndFormattedDate',
      headerTranslationKey: 'custom-table-columns.listed',
      key: 'listedDate',
      getCellProps: row => ({
        date: row.listedDate,
      }),
    }),
    getColumn({
      columnName: 'address',
      headerTranslationKey: 'custom-table-columns.borrower',
      getCellProps: row => ({
        address: row.borrower,
        align: 'right',
      }),
      overrides: {
        minWidth: 120,
        headerAlign: 'right',
      },
    }),
    getColumn({
      columnName: 'multiActionButton',
      headerTranslationKey: 'custom-table-columns.empty',
      key: 'actions',
      getCellProps: row => ({
        prioritisedActions: getRowPrioritisedActions(row),
      }),
      overrides: {
        minWidth: 170,
        hideable: false,
      },
    }),
  ], [getColumn, getRowPrioritisedActions, t])

  return columns
}
