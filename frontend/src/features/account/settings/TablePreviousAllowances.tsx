import { useCallback, useMemo } from 'react'
import { TableNoPagination } from 'src/components/Tables/TableNoPagination'
import { useColumns } from 'src/components/Tables/useColumns'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { Currency } from 'src/entities/domain/Currency'
import { config } from 'src/config/config'
import { NftfiCurrency } from 'src/entities/domain/NftfiCurrency'
import { getCurrencyTicker } from 'src/utils/currencies'

const contractAllowanceMap = [
  {
    contract: config.ethereum.contracts.nftfi.v2_3.assetLoan,
    currency: Currency.WETH as NftfiCurrency,
    label: 'v2.3 Fixed',
  },
  {
    contract: config.ethereum.contracts.nftfi.v2_3.assetLoan,
    currency: Currency.USDC as NftfiCurrency,
    label: 'v2.3 Fixed',
  },
  {
    contract: config.ethereum.contracts.nftfi.v2_3.assetLoan,
    currency: Currency.DAI as NftfiCurrency,
    label: 'v2.3 Fixed',
  },
  {
    contract: config.ethereum.contracts.nftfi.v2_3.collectionLoan,
    currency: Currency.WETH as NftfiCurrency,
    label: 'v2.3 Fixed Collection',
  },
  {
    contract: config.ethereum.contracts.nftfi.v2_3.collectionLoan,
    currency: Currency.USDC as NftfiCurrency,
    label: 'v2.3 Fixed Collection',
  },
  {
    contract: config.ethereum.contracts.nftfi.v2_3.collectionLoan,
    currency: Currency.DAI as NftfiCurrency,
    label: 'v2.3 Fixed Collection',
  },
]

export function TablePreviousAllowances() {
  const { t } = useTranslation()
  const { getColumn } = useColumns<typeof contractAllowanceMap[number]>()

  const columns = useMemo(
    () => [
      getColumn({
        columnName: 'textWithSubtext',
        headerTranslationKey: 'custom-table-columns.nftfi-contract',
        getCellProps: row => ({
          text: row.label,
          subtext: getCurrencyTicker(row.currency),
        }),
      }),
      getColumn({
        columnName: 'contractAddress',
        headerTranslationKey: 'custom-table-columns.contract-address',
        getCellProps: row => ({ address: row.contract.address }),
        overrides: { flex: 1 },
      }),
      getColumn({
        columnName: 'remainingAllowance',
        headerTranslationKey: 'custom-table-columns.remaining-allowance',
        getCellProps: row => ({ spender: row.contract.address, currency: row.currency }),
      }),
      getColumn({
        columnName: 'setAllowance',
        headerTranslationKey: 'custom-table-columns.set-allowance',
        getCellProps: row => ({
          spender: row.contract.address,
          currency: row.currency,
        }),
        overrides: { flex: 1 },
      }),
    ],
    [getColumn]
  )

  const getRowId = useCallback(
    (row: typeof contractAllowanceMap[number]) => `${row.contract.address}-${getCurrencyTicker(row.currency)}`,
    []
  )

  return (
    <TableNoPagination<typeof contractAllowanceMap[number]>
      rows={contractAllowanceMap}
      getRowId={getRowId}
      columns={columns}
      title={t('user-details-page.previous-contracts')}
    />
  )
}
