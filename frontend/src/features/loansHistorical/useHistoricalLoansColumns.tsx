import { useCallback, useMemo } from 'react'
import { useColumns } from 'src/components/Tables/useColumns'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { config } from 'src/config/config'
import { Protocol } from 'src/entities/domain/Protocol'
import { Loan, LoanStatus } from 'src/entities/domain/Loan'
import { LoanExtended } from 'src/entities/app/LoanExtended'
import { NftExtended } from 'src/entities/app/NftExtended'
import { NftInfo } from 'src/entities/app/NftInfo'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { LoanStatusDisplayKeys } from 'src/utils/loans'
import { useModals } from 'src/modules/modals/useModals'
import { Modals } from 'src/modules/modals/Modals'
import { ViewLoanExtensionOfferActionCell } from 'src/features/loanExtension/ViewLoanExtensionOfferActionCell'

export type HistoricalLoansSide = 'borrower' | 'lender'

type HistoricalLoanRow = LoanExtended<NftExtended<NftInfo | CollectionExtended<CollectionInfo>>> & Loan<Protocol>

const V3_LOAN_CONTRACT_ADDRESSES = new Set<string>([
  config.ethereum.contracts.nftfi.v3.assetOfferLoan.address.toLowerCase(),
  config.ethereum.contracts.nftfi.v3.collectionOfferLoan.address.toLowerCase(),
])

function isNftfiV3Loan(row: HistoricalLoanRow): boolean {
  return row.protocol === Protocol.Nftfi
    && row.loanContract !== undefined
    && V3_LOAN_CONTRACT_ADDRESSES.has(row.loanContract.toLowerCase())
}

export function useHistoricalLoansColumns(side: HistoricalLoansSide) {
  const { t } = useTranslation()
  const { open: openLiquidateModal } = useModals(Modals.Liquidate)
  const { open: openLoanExtensionModal } = useModals(Modals.LoanExtension)
  const { open: openAcceptLoanExtensionModal } = useModals(Modals.AcceptLoanExtension)

  const handleForeclose = useCallback((row: HistoricalLoanRow) => {
    openLiquidateModal({ loan: row })
  }, [openLiquidateModal])

  const handleExtendLoan = useCallback((row: HistoricalLoanRow) => {
    openLoanExtensionModal({ loan: row })
  }, [openLoanExtensionModal])

  const handleViewExtensionOffer = useCallback((row: HistoricalLoanRow) => {
    openAcceptLoanExtensionModal({ loan: row })
  }, [openAcceptLoanExtensionModal])

  const { getColumn } = useColumns<HistoricalLoanRow>()

  const columns = useMemo(() => {
    const baseColumns = [
      getColumn({
        columnName: 'assetInfoDashboard',
        headerTranslationKey: 'custom-table-columns.asset',
        getCellProps: row => ({ nft: row.nft }),
        overrides: { minWidth: 250, hideable: false },
      }),
      getColumn({
        columnName: 'textWithSubtext',
        headerTranslationKey: 'custom-table-columns.status',
        getCellProps: row => ({
          text: t(LoanStatusDisplayKeys[row.status]),
        }),
        overrides: { minWidth: 110 },
      }),
      getColumn({
        columnName: 'amount',
        headerTranslationKey: 'custom-table-columns.principal',
        getCellProps: row => ({
          weiAmount: row.terms.principal,
          currency: row.terms.currency,
        }),
      }),
      getColumn({
        columnName: 'amount',
        headerTranslationKey: 'custom-table-columns.repayment',
        getCellProps: row => ({
          weiAmount: row.terms.repayment,
          currency: row.terms.currency,
        }),
      }),
      getColumn({
        columnName: 'textWithSubtext',
        headerTranslationKey: 'custom-table-columns.loan-type',
        getCellProps: row => ({
          text: row.terms.isProRated
            ? 'Flexible'
            : 'Fixed',
          subtext: 'loan',
          monoFont: true,
        }),
        overrides: { minWidth: 90, headerAlign: 'right', align: 'right' },
      }),
      getColumn({
        columnName: 'percentage',
        headerTranslationKey: 'custom-table-columns.apr',
        getCellProps: row => ({ percentage: row.terms.apr }),
      }),
      getColumn({
        columnName: 'amount',
        headerTranslationKey: 'custom-table-columns.origination',
        getCellProps: row => ({
          weiAmount: row.terms.origination,
          currency: row.terms.currency,
        }),
      }),
      getColumn({
        columnName: 'percentage',
        headerTranslationKey: 'custom-table-columns.effective-apr',
        getCellProps: row => ({ percentage: row.terms.effectiveApr }),
      }),
      getColumn({
        columnName: 'textWithSubtext',
        headerTranslationKey: 'custom-table-columns.loan-id',
        getCellProps: row => ({ text: row.loanId.toString() }),
        overrides: { minWidth: 100, headerAlign: 'right', align: 'right' },
      }),
      getColumn({
        columnName: 'date',
        headerTranslationKey: 'custom-table-columns.loan-due',
        getCellProps: row => ({ date: row.dateDue }),
      }),
      getColumn({
        columnName: 'address',
        headerTranslationKey: side === 'borrower'
          ? 'custom-table-columns.lender'
          : 'custom-table-columns.borrower',
        getCellProps: row => ({
          address: side === 'borrower' ? row.lender : row.borrower,
          align: 'right',
        }),
        overrides: { minWidth: 100, headerAlign: 'right' },
      }),
    ]

    if (side === 'lender') {
      baseColumns.push(getColumn({
        columnName: 'multiActionButton',
        key: 'lender-actions',
        headerTranslationKey: 'custom-table-columns.empty',
        getCellProps: row => {
          if (row.status !== LoanStatus.Defaulted) {
            return { prioritisedActions: [] }
          }
          const actions = [
            {
              label: t('custom-table-columns.foreclose-cta'),
              onClick: () => handleForeclose(row),
              'data-test-id': 'lend.history.foreclose',
            },
          ]
          // Loan extension calls renegotiateLoan(...) on an NFTfi v3 loan contract.
          // Earlier NFTfi versions (v1/v2/v2-1/v2-3) and other protocols don't expose that path.
          if (isNftfiV3Loan(row)) {
            actions.push({
              label: t('custom-table-columns.extend-loan-cta'),
              onClick: () => handleExtendLoan(row),
              'data-test-id': 'lend.history.extend-loan',
            })
          }
          return { prioritisedActions: actions }
        },
        overrides: { minWidth: 160, hideable: false },
      }))
    }

    if (side === 'borrower') {
      baseColumns.push(getColumn({
        columnName: 'actionButton',
        key: 'view-extension-offer-action',
        headerTranslationKey: 'custom-table-columns.empty',
        getCellProps: row => ({
          onClick: handleViewExtensionOffer as (row: unknown) => void,
          rowData: row,
          buttonCopyTranslationKey: 'custom-table-columns.view-extension-offer-cta',
          show: row.status === LoanStatus.Defaulted,
        }),
        overrides: {
          minWidth: 140,
          hideable: false,
          renderCell: params => params.row.status === LoanStatus.Defaulted && isNftfiV3Loan(params.row)
            ? (
              <ViewLoanExtensionOfferActionCell
                loan={params.row}
                onClick={handleViewExtensionOffer}
              />
            )
            : null,
        },
      }))
    }

    return baseColumns
  }, [getColumn, side, handleForeclose, handleExtendLoan, handleViewExtensionOffer, t])

  return columns
}
