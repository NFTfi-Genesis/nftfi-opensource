import { useMemo } from 'react'
import { useColumns } from 'src/components/Tables/useColumns'
import { LenderStats, LenderSortBy } from 'src/entities/app/LenderStats'
import { Currency } from 'src/entities/domain/Currency'
import { Amount } from 'src/entities/base/Amount'

export function useLendersColumns() {
  const { getColumn } = useColumns<LenderStats>()

  const columns = useMemo(
    () => [
      getColumn({
        columnName: 'addressLarge',
        headerTranslationKey: 'custom-table-columns.lender',
        getCellProps: row => ({
          address: row.lenderAddress,
        }),
        overrides: { width: 150, minWidth: 200, hideable: false },
        serverSortableField: LenderSortBy.lenderAddress,
      }),
      getColumn({
        columnName: 'numberWithSubtext',
        headerTranslationKey: 'custom-table-columns.total-loans',
        getCellProps: row => ({
          number: row.loanCount,
          subtext: 'Loans',
        }),
        serverSortableField: LenderSortBy.loanCount,
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
        serverSortableField: LenderSortBy.totalUsdValue,
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
        serverSortableField: LenderSortBy.avgUsdValue,
        overrides: {
          minWidth: 155,
        },
      }),
      getColumn({
        columnName: 'percentage',
        headerTranslationKey: 'custom-table-columns.avg-apr',
        getCellProps: row => ({ percentage: row.avgApr }),
        serverSortableField: LenderSortBy.avgApr,
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
          searchParams.set('wallets', row.lenderAddress)
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
