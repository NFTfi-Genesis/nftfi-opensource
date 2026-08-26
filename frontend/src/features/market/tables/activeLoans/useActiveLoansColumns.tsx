import { useMemo, useCallback } from 'react'
import { Modals } from 'src/modules/modals/Modals'
import { Address } from 'src/entities/base/Address'
import { useColumns } from 'src/components/Tables/useColumns'
import { LoansSortBy } from 'src/entities/domain/Loan'
import { Protocol } from 'src/entities/domain/Protocol'
import { CROSS_PROTOCOL_REFI_ENABLED, GONDI_LOAN_V3_1_ADDRESS, GONDI_LOAN_V3_ADDRESS } from 'src/constants'
import { getAssetProtocolLink } from 'src/utils/protocols'
import { TooltipAprVsEapr } from 'src/components/TooltipAprVsEapr'
import { TooltipLtvChange } from 'src/components/TooltipLtvChange'
import { MultiActionButtonAction } from 'src/components/MultiActionButton/MultiActionButton'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { useWallet } from 'src/modules/wallet/useWallet'
import { useModals } from 'src/modules/modals/useModals'
import { useRequireWallet } from 'src/hooks/useRequireWallet'
import { getTestId } from 'src/utils/testing'
import { ActiveLoansTableRow } from './market/MarketLoansTable'

// LTV/floor aren't returned by v1/loans yet. Keep the column definition below so re-enabling
// is a one-line flip, but exclude it from the rendered columns until then — leaving it in and
// force-hiding via columnVisibilityModel fights MUI's own show/hide-all column toggle.
const LTV_SUPPORTED = false

export type UseActiveLoansColumnsParams = {
  onAddressClick?: (address: Address) => void
  onViewOffers?: (row: ActiveLoansTableRow) => void
}

export function useActiveLoansColumns({
  onAddressClick,
  onViewOffers,
}: UseActiveLoansColumnsParams) {
  const { t } = useTranslation()
  const { getColumn } = useColumns<ActiveLoansTableRow>()
  const { walletAddress } = useWallet()
  const { open: openMakeAssetOfferModal } = useModals(Modals.MakeAssetOffer)
  const { open: openMakeCollectionOfferModal } = useModals(Modals.MakeCollectionOffer)
  const { open: openRepayLoanModal } = useModals(Modals.Repay)
  const requireWallet = useRequireWallet()

  const handleMakeAssetOffer = useCallback((row: ActiveLoansTableRow) => {
    requireWallet(() => {
      openMakeAssetOfferModal({ nft: row.nft, borrower: row.borrower })
    })
  }, [openMakeAssetOfferModal, requireWallet])

  const handleMakeCollectionOffer = useCallback((row: ActiveLoansTableRow) => {
    requireWallet(() => {
      openMakeCollectionOfferModal({ collection: row.nft.collection })
    })
  }, [openMakeCollectionOfferModal, requireWallet])

  const handleRepay = useCallback((row: ActiveLoansTableRow) => {
    requireWallet(() => {
      openRepayLoanModal({ loan: row })
    })
  }, [openRepayLoanModal, requireWallet])

  // Get prioritised actions based on loan details and wallet match
  const getRowPrioritisedActions = useCallback((row: ActiveLoansTableRow): MultiActionButtonAction[] => {
    const isBorrower = walletAddress?.toLowerCase() === row.borrower.toLowerCase()
    const actions: MultiActionButtonAction[] = []

    if (isBorrower) {
      // Borrower actions
      // Cross-protocol refi disabled: only NFTfi loans can be refinanced. Gondi
      // loans are gated behind CROSS_PROTOCOL_REFI_ENABLED (currently off).
      const shouldShowRefinance = row.protocol === Protocol.Nftfi
        || (CROSS_PROTOCOL_REFI_ENABLED
          && row.protocol === Protocol.Gondi
          && (row?.loanContract?.toLowerCase() === GONDI_LOAN_V3_1_ADDRESS.toLowerCase()
            || row?.loanContract?.toLowerCase() === GONDI_LOAN_V3_ADDRESS.toLowerCase()))

      if (shouldShowRefinance && onViewOffers) {
        actions.push({ label: t('custom-table-columns.refinance-cta'), onClick: () => onViewOffers(row), ...getTestId('borrow.view-offers') })
      }

      if (handleRepay) {
        actions.push({ label: t('borrow.repay'), onClick: () => handleRepay(row), ...getTestId('borrow.repay') })
      }

      return actions
    } else {
      // Non-borrower actions (Lender or potential lender)
      if (onViewOffers) {
        actions.push({ label: t('borrow.view-offers'), onClick: () => onViewOffers(row), ...getTestId('lend.view-offers') })
      }

      if (handleMakeAssetOffer) {
        actions.push({ label: t('lend.make-offer'), onClick: () => handleMakeAssetOffer(row), ...getTestId('lend.make-offer') })
      }

      if (handleMakeCollectionOffer) {
        actions.push({ label: t('lend.make-collection-offer'), onClick: () => handleMakeCollectionOffer(row), ...getTestId('lend.make-collection-offer') })
      }

      return actions
    }
  }, [walletAddress, onViewOffers, handleMakeAssetOffer, handleMakeCollectionOffer, handleRepay, t])

  const columns = useMemo(
    () => [
      getColumn({
        columnName: 'logo',
        headerTranslationKey: 'custom-table-columns.protocol',
        key: 'Protocol',
        getCellProps: row => ({
          protocol: row.protocol,
        }),
        serverSortableField: LoansSortBy.protocolName,
      }),
      getColumn({
        columnName: 'assetInfoDashboard',
        headerTranslationKey: 'custom-table-columns.asset',
        getCellProps: row => ({
          nft: row.nft,
          nftLink: getAssetProtocolLink({
            protocol: row.protocol,
            nftAddress: row.nft.address,
            nftId: row.nft.id,
            loanId: row.loanId.toString(),
            loanContractAddress: row.loanContractName,
            nftProjectName: row.nft.collection.info.name,
          }),
        }),
        serverSortableField: LoansSortBy.nftProjectName,
        overrides: {
          flex: 2,
          hideable: false,
        },
      }),
      getColumn({
        columnName: 'contractAddress',
        headerTranslationKey: 'custom-table-columns.contract-address',
        key: 'LoanContract',
        getCellProps: row => ({
          address: row.loanContract ?? null,
          fallback: '-',
        }),
        overrides: {
          minWidth: 150,
        },
      }),
      getColumn({
        columnName: 'textWithSubtext',
        headerTranslationKey: 'custom-table-columns.loan-id',
        key: 'LoanId',
        getCellProps: row => ({ text: row.loanId.toString() }),
        overrides: {
          minWidth: 100,
        },
      }),
      getColumn({
        columnName: 'amount',
        headerTranslationKey: 'custom-table-columns.principal',
        getCellProps: row => ({
          weiAmount: row.terms.principal,
          currency: row.terms.currency,
        }),
        serverSortableField: LoansSortBy.principalAmount,
      }),
      getColumn({
        columnName: 'amount',
        headerTranslationKey: 'custom-table-columns.repayment',
        getCellProps: row => ({
          weiAmount: row.terms.repayment,
          currency: row.terms.currency,
          tooltip: row.protocol === Protocol.Blur
            ? 'dashboard.amount-tooltip.dynamic-repayment'
            : undefined,
        }),
        serverSortableField: LoansSortBy.maximumRepaymentAmount,
        overrides: {
          minWidth: 130,
        },
      }),
      getColumn({
        columnName: 'percentage',
        headerTranslationKey: 'custom-table-columns.apr',
        getCellProps: row => ({ percentage: row.terms.apr }),
        serverSortableField: LoansSortBy.apr,
        columnInfoTooltip: <TooltipAprVsEapr />,
      }),
      getColumn({
        columnName: 'ltv',
        key: 'ltv',
        headerTranslationKey: 'custom-table-columns.ltv',
        getCellProps: row => ({
          percentage: row.ltvActual,
          change: row.ltvChange,
        }),
        columnInfoTooltip: <TooltipLtvChange />,
      }),
      getColumn({
        columnName: 'date',
        headerTranslationKey: 'custom-table-columns.start-date',
        getCellProps: row => ({
          date: row.dateStarted,
          tooltip:
            row.protocol === Protocol.X2y2 || row.protocol === Protocol.Zharta || row.protocol === Protocol.Metastreet
              ? 'dashboard.date-tooltip.delayed-refresh'
              : undefined,
        }),
        serverSortableField: LoansSortBy.startTime,
        overrides: {
          minWidth: 120,
        },
      }),
      getColumn({
        columnName: 'duration',
        getCellProps: row => ({
          amount: row.terms.duration,
          unit: 'second',
          tooltip:
            row.protocol === Protocol.X2y2 || row.protocol === Protocol.Zharta || row.protocol === Protocol.Metastreet
              ? 'dashboard.date-tooltip.delayed-refresh'
              : undefined,
        }),
        serverSortableField: LoansSortBy.durationDays,
        overrides: {
          minWidth: 110,
        },
      }),
      getColumn({
        columnName: 'date',
        headerTranslationKey: 'custom-table-columns.due-date',
        getCellProps: row => ({
          date: row.dateDue,
          tooltip:
            row.protocol === Protocol.Blur
              ? 'dashboard.date-tooltip.perpetual-loan'
              : row.protocol === Protocol.X2y2
                  || row.protocol === Protocol.Zharta
                  || row.protocol === Protocol.Metastreet
                ? 'dashboard.date-tooltip.delayed-refresh'
                : undefined,
        }),
        serverSortableField: LoansSortBy.dueTime,
        overrides: {
          minWidth: 120,
        },
      }),
      getColumn({
        columnName: 'timeRemaining',
        headerTranslationKey: 'custom-table-columns.due-in',
        getCellProps: row => ({
          timeRemainingSeconds: row.secondsUntilDue,
          tooltip:
            row.protocol === Protocol.Blur
              ? 'dashboard.date-tooltip.perpetual-loan'
              : row.protocol === Protocol.X2y2
                  || row.protocol === Protocol.Zharta
                  || row.protocol === Protocol.Metastreet
                ? 'dashboard.date-tooltip.delayed-refresh'
                : undefined,
        }),
        overrides: {
          minWidth: 90,
        },
        serverSortableField: LoansSortBy.secondsUntilDue,
      }),
      getColumn({
        columnName: 'address',
        headerTranslationKey: 'custom-table-columns.borrower',
        getCellProps: row => ({
          address: row.borrower,
          align: 'right',
          onAddressClick: onAddressClick,
        }),
        serverSortableField: LoansSortBy.borrowerAddress,
        overrides: {
          minWidth: 110,
          headerAlign: 'right',
        },
      }),
      getColumn({
        columnName: 'address',
        headerTranslationKey: 'custom-table-columns.lender',
        getCellProps: row => ({
          address: row.lender,
          align: 'right',
          onAddressClick: onAddressClick,
        }),
        serverSortableField: LoansSortBy.lenderAddress,
        overrides: {
          minWidth: 110,
          headerAlign: 'right',
        },
      }),
      getColumn({
        columnName: 'multiActionButton',
        headerTranslationKey: 'custom-table-columns.empty',
        key: 'Actions',
        getCellProps: row => ({
          prioritisedActions: getRowPrioritisedActions(row),
        }),
        overrides: {
          minWidth: 190,
          hideable: false,
        },
      }),
    ].filter(column => LTV_SUPPORTED || column.field !== 'ltv'),
    [getColumn, onAddressClick, getRowPrioritisedActions]
  )

  return { columns }
}
