import { useCallback, useMemo } from 'react'
import { Seconds } from 'src/entities/base/Seconds'
import { Wei } from 'src/entities/base/Wei'
import { Offer } from 'src/entities/domain/Offer'
import { useColumns } from 'src/components/Tables/useColumns'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { calculateRefinanceProceedsAtTerm, getIsProratedOptionsDisplayText } from 'src/utils/terms'
import { useModals } from 'src/modules/modals/useModals'
import { Modals } from 'src/modules/modals/Modals'
import { useRequireWallet } from 'src/hooks/useRequireWallet'
import { LoanExtended } from 'src/entities/app/LoanExtended'
import { NftExtended } from 'src/entities/app/NftExtended'
import { NftInfo } from 'src/entities/app/NftInfo'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { Protocol } from 'src/entities/domain/Protocol'
import { CROSS_PROTOCOL_REFI_ENABLED } from 'src/constants'
import { isAssetOffer, isCollectionOffer, isContractOffer, isHighEffectiveApr } from 'src/utils/offers'
import { OfferExtended } from 'src/entities/app/OfferExtended'
import { CollectionStats } from 'src/entities/app/CollectionStats'
import { useWallet } from 'src/modules/wallet/useWallet'

export type UseBorrowerOffersColumnsParams = {
  loan: LoanExtended<NftExtended<NftInfo | CollectionExtended<CollectionInfo>>>
}

export function useBorrowerOffersColumns({ loan }: UseBorrowerOffersColumnsParams) {
  const { t } = useTranslation()
  const { getColumn } = useColumns<OfferExtended<CollectionStats>>()
  const { open: openRefiLoanNftfiModal } = useModals(Modals.RefiLoanNftfi)
  const { open: openRefiLoanGondiModal } = useModals(Modals.RefiLoanGondi)
  const requireWallet = useRequireWallet()
  const { walletAddress } = useWallet()

  const handleRefiLoan = useCallback((rowData: unknown) => {
    const row = rowData as Offer
    requireWallet(() => {
      if (loan.protocol === Protocol.Nftfi) {
        openRefiLoanNftfiModal({ loan, offerId: row.id })
      } else if (loan.protocol === Protocol.Gondi) {
        openRefiLoanGondiModal({ loan, offerId: row.id })
      }
    })
  }, [requireWallet, openRefiLoanNftfiModal, openRefiLoanGondiModal, loan])

  // Cross-protocol refi disabled: the "Accept" column (which refinances this loan
  // with an NFTfi offer) is shown only for NFTfi loans. Gondi loans are gated
  // behind CROSS_PROTOCOL_REFI_ENABLED (currently off); the column itself stays
  // for NFTfi→NFTfi refinancing.
  const canRefinanceLoan = loan.protocol === Protocol.Nftfi
    || (CROSS_PROTOCOL_REFI_ENABLED && loan.protocol === Protocol.Gondi)

  const columns = useMemo(
    () => [
      {
        ...getColumn({
          columnName: 'amount',
          headerTranslationKey: 'custom-table-columns.principal',
          getCellProps: row => ({
            weiAmount: row.terms.principal,
            currency: row.terms.currency,
          }),
          overrides: {
            minWidth: 130,
            align: 'left',
            headerAlign: 'left',
            hideable: false,
          },
        }),
        sortable: false,
        serverSortableField: 'principal',
      },
      {
        ...getColumn({
          columnName: 'textWithSubtext',
          headerTranslationKey: 'filters.loan-type',
          getCellProps: row => ({
            text: getIsProratedOptionsDisplayText(row.terms.isProRated, t),
            subtext: t('borrow.loan'),
            monoFont: true,
          }),
          overrides: {
            minWidth: 120,
          },
        }),
        sortable: false,
        serverSortableField: 'loanType',
      },
      getColumn({
        columnName: 'textWithSubtext',
        headerTranslationKey: 'custom-table-columns.offer-type',
        key: 'offerType',
        getCellProps: row => {
          const props = {
            text: 'Unknown',
            subtext: t('borrow.offer'),
            monoFont: true,
          }
          if (isAssetOffer(row)) {
            props.text = 'Asset'
          }

          if (isCollectionOffer(row)) {
            props.text = 'Collection'
          }

          if (isContractOffer(row)) {
            props.text = 'Contract'
          }

          return props
        },
        serverSortableField: 'offerType',
        overrides: {
          minWidth: 120,
          headerAlign: 'right',
          align: 'right',
          sortable: false,
        },
      }),
      {
        ...getColumn({
          columnName: 'percentage',
          headerTranslationKey: 'custom-table-columns.apr',
          getCellProps: row => ({ percentage: row.terms.apr }),
          overrides: { minWidth: 90 },
        }),
        sortable: false,
        serverSortableField: 'apr',
      },
      {
        ...getColumn({
          columnName: 'amount',
          headerTranslationKey: 'custom-table-columns.orig-fee',
          getCellProps: row => ({
            weiAmount: row.terms.origination,
            currency: row.terms.currency,
          }),
          overrides: { minWidth: 120 },
        }),
        sortable: false,
        serverSortableField: 'originationFee',
      },
      {
        ...getColumn({
          columnName: 'percentage',
          headerTranslationKey: 'custom-table-columns.eff-apr',
          key: 'effectiveApr',
          getCellProps: row => ({
            percentage: row.terms.effectiveApr,
            standoutStyle: isHighEffectiveApr(row, row.collectionStats?.avgApr),
          }),
          overrides: { minWidth: 120 },
        }),
        sortable: false,
        serverSortableField: 'effectiveApr',
      },
      {
        ...getColumn({
          columnName: 'duration',
          getCellProps: row => ({
            amount: Math.floor(Number(row.terms.duration) / (24 * 60 * 60)),
            unit: 'day',
          }),
          overrides: { minWidth: 110 },
        }),
        sortable: false,
        serverSortableField: 'duration',
      },
      {
        ...getColumn({
          columnName: 'amount',
          headerTranslationKey: 'custom-table-columns.repayment',
          key: 'repayment',
          getCellProps: row => ({
            weiAmount: row.terms.repayment,
            currency: row.terms.currency,
          }),
          overrides: { minWidth: 130 },
        }),
        sortable: false,
        serverSortableField: 'repayment',
      },
      {
        ...getColumn({
          columnName: 'amount',
          headerTranslationKey: 'borrow.received-on-refinance',
          key: 'refiProceeds',
          getCellProps: row => {
            const proceeds = calculateRefinanceProceedsAtTerm(
              row.terms.principal,
              row.terms.origination,
              loan.terms.repayment
            )
            const isPositive = proceeds >= 0n
            return {
              weiAmount: proceeds as Wei,
              currency: row.terms.currency,
              tooltip: isPositive
                ? 'borrow.received-on-refinance-tooltip'
                : 'borrow.paid-on-refinance-tooltip',
            }
          },
          overrides: { minWidth: 150 },
        }),
        sortable: false,
      },
      {
        ...getColumn({
          columnName: 'timeRemaining',
          headerTranslationKey: 'custom-table-columns.expires-in',
          getCellProps: row => ({
            timeRemainingSeconds: (row.expiry - Math.floor(Date.now() / 1000)) as Seconds,
          }),
          overrides: { minWidth: 120 },
        }),
        sortable: false,
        serverSortableField: 'expiry',
      },
      {
        ...getColumn({
          columnName: 'address',
          headerTranslationKey: 'custom-table-columns.lender',
          getCellProps: row => ({
            address: row.lender,
            align: 'right',
          }),
          overrides: {
            minWidth: 110,
            headerAlign: 'right',
          },
        }),
        sortable: false,
      },
      ...(canRefinanceLoan
        ? [getColumn({
          columnName: 'actionButton',
          headerTranslationKey: 'custom-table-columns.empty',
          key: 'Accept',
          getCellProps: row => {
            const isCurrencyMismatch = row.terms.currency !== loan.terms.currency
            const isOwnOffer = Boolean(walletAddress && row.lender === walletAddress)
            return {
              rowData: row,
              buttonCopyTranslationKey: 'custom-table-columns.accept-cta',
              onClick: handleRefiLoan,
              disabled: isCurrencyMismatch || isOwnOffer,
              tooltipCopy: isCurrencyMismatch
                ? 'borrow.accept-offer-disabled-tooltip'
                : isOwnOffer
                  ? 'borrow.accept-own-offer-disabled-tooltip'
                  : undefined,
            }
          },
          overrides: { minWidth: 120, hideable: false },
        })]
        : []),
    ],
    [getColumn, t, loan, handleRefiLoan, walletAddress, canRefinanceLoan]
  )

  return { columns }
}
