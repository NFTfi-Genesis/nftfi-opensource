import { useMemo } from 'react'
import { useColumns } from 'src/components/Tables/useColumns'
import { BorrowerStats, BorrowerSortBy } from 'src/entities/app/BorrowerStats'
import { Currency } from 'src/entities/domain/Currency'
import { Amount } from 'src/entities/base/Amount'
import { Address } from 'src/entities/base/Address'

export function useBorrowersColumns() {
  const { getColumn } = useColumns<BorrowerStats>()

  const columns = useMemo(
    () => [
      getColumn({
        columnName: 'addressLarge',
        headerTranslationKey: 'custom-table-columns.borrower',
        getCellProps: row => ({
          address: row.borrowerAddress as Address,
        }),
        overrides: { width: 150, minWidth: 200, hideable: false },
        serverSortableField: BorrowerSortBy.borrowerAddress,
      }),
      getColumn({
        columnName: 'numberWithSubtext',
        headerTranslationKey: 'custom-table-columns.total-loans',
        getCellProps: row => ({
          number: row.loanCount,
          subtext: 'Loans',
        }),
        serverSortableField: BorrowerSortBy.loanCount,
        overrides: {
          minWidth: 130,
        },
      }),
      getColumn({
        columnName: 'amount',
        headerTranslationKey: 'custom-table-columns.outstanding-debt',
        getCellProps: row => ({
          amount: row.outstandingDebt || (0 as Amount),
          currency: Currency.USD,
        }),
        serverSortableField: BorrowerSortBy.totalUsdValue,
        overrides: {
          minWidth: 170,
        },
      }),
      getColumn({
        columnName: 'amount',
        headerTranslationKey: 'custom-table-columns.avg-loan-value',
        getCellProps: row => ({
          amount: row.avgValue || (0 as Amount),
          currency: Currency.USD,
        }),
        serverSortableField: BorrowerSortBy.avgUsdValue,
        overrides: {
          minWidth: 155,
        },
      }),
      getColumn({
        columnName: 'percentage',
        headerTranslationKey: 'custom-table-columns.avg-apr',
        getCellProps: row => ({ percentage: row.avgApr }),
        serverSortableField: BorrowerSortBy.avgApr,
        overrides: {
          minWidth: 120,
        },
      }),
      getColumn({
        columnName: 'link',
        headerTranslationKey: 'custom-table-columns.empty',
        key: 'View loans',
        getCellProps: row => {
          const searchParams = new URLSearchParams(window.location.search)
          searchParams.set('wallets', row.borrowerAddress)
          return {
            path: `/market/active-loans?${searchParams.toString()}`,
            linkCopyTranslationKey: 'custom-table-columns.view-loans',
          }
        },
        overrides: { minWidth: 140, maxWidth: 165, hideable: false },
      }),
    ],
    [getColumn]
  )

  return { columns }
}
