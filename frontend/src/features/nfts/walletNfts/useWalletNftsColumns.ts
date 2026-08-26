import { useMemo, useCallback } from 'react'
import { useColumns } from 'src/components/Tables/useColumns'
import { Currency } from 'src/entities/domain/Currency'
import { MultiActionButtonAction } from 'src/components/MultiActionButton/MultiActionButton'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { getTestId } from 'src/utils/testing'
import { WalletNftsTableRow } from './WalletNftsTable'

// Temporarily disabled on the Get a Loan page: borrowers can no longer list /
// unlist / edit terms or view offers from the wallet-assets table. Flip back to
// true to restore the row actions column (and re-enable the offer split panel
// via OFFERS_SPLIT_ENABLED in GetALoanPage).
const ROW_ACTIONS_ENABLED = false

export type UseWalletNftsColumnsParams = {
  onList: (row: WalletNftsTableRow) => void
  onEdit: (row: WalletNftsTableRow) => void
  onUnlist: (row: WalletNftsTableRow) => void
  onViewOffers: (row: WalletNftsTableRow) => void
}

export function useWalletNftsColumns({
  onList,
  onEdit,
  onUnlist,
  onViewOffers,
}: UseWalletNftsColumnsParams) {
  const { t } = useTranslation()
  const { getColumn } = useColumns<WalletNftsTableRow>()

  const getRowPrioritisedActions = useCallback((row: WalletNftsTableRow): MultiActionButtonAction[] => {
    if (!row.listing) {
      return [
        { label: t('borrow.list-asset'), onClick: () => onList(row), ...getTestId('borrow.list') },
        { label: t('borrow.view-offers'), onClick: () => onViewOffers(row), ...getTestId('borrow.view-offers') },
      ]
    }
    if (row.listing) {
      return [
        { label: t('borrow.view-offers'), onClick: () => onViewOffers(row), ...getTestId('borrow.view-offers') },
        { label: t('borrow.edit-terms'), onClick: () => onEdit(row), ...getTestId('borrow.edit') },
        { label: t('borrow.unlist-asset'), onClick: () => onUnlist(row), ...getTestId('borrow.unlist') },
      ]
    }
    return [
      { label: t('borrow.view-offers'), onClick: () => onViewOffers(row), ...getTestId('borrow.view-offers') },
    ]
  }, [onList, onEdit, onUnlist, onViewOffers, t])

  const actionsColumn = useMemo(() => getColumn({
    columnName: 'multiActionButton',
    headerTranslationKey: 'custom-table-columns.empty',
    key: 'Actions',
    getCellProps: row => ({
      prioritisedActions: getRowPrioritisedActions(row),
    }),
    overrides: {
      minWidth: 160,
      hideable: false,
      headerName: 'Action',
      renderHeader: () => null,
    },
  }), [getColumn, getRowPrioritisedActions])

  const columns = useMemo(
    () => [
      {
        ...getColumn({
          columnName: 'assetInfoDashboard',
          headerTranslationKey: 'custom-table-columns.asset',
          getCellProps: row => ({
            nft: row,
          }),
          overrides: {
            flex: 2,
            hideable: false,
          },
        }),
        sortable: false,
      },
      {
        ...getColumn({
          columnName: 'amount',
          headerTranslationKey: 'custom-table-columns.avg-loan-amount',
          getCellProps: row => ({
            amount: row.collection.stats.avgLoanAmount,
            currency: Currency.USD,
          }),
          overrides: { minWidth: 170 },
        }),
        sortable: false,
        serverSortableField: 'avgLoanAmount',
      },
      {
        ...getColumn({
          columnName: 'percentage',
          headerTranslationKey: 'custom-table-columns.avg-apr',
          getCellProps: row => ({ percentage: row.collection.stats.avgApr }),
          overrides: { minWidth: 120 },
        }),
        sortable: false,
        serverSortableField: 'avgApr',
      },
      {
        ...getColumn({
          columnName: 'listingStatus',
          headerTranslationKey: 'custom-table-columns.listed',
          getCellProps: row => ({
            isListed: Boolean(row.listing),
          }),
          overrides: { minWidth: 100 },
        }),
        sortable: false,
        serverSortableField: 'listed',
      },
      ...(ROW_ACTIONS_ENABLED ? [actionsColumn] : []),
    ],
    [getColumn, actionsColumn]
  )

  return { columns }
}
