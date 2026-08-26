import { useCallback, useMemo } from 'react'
import { Seconds } from 'src/entities/base/Seconds'
import { Offer } from 'src/entities/domain/Offer'
import { useColumns } from 'src/components/Tables/useColumns'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { getIsProratedOptionsDisplayText } from 'src/utils/terms'
import { useModals } from 'src/modules/modals/useModals'
import { Modals } from 'src/modules/modals/Modals'
import { WalletNftsTableRow } from 'src/features/nfts/walletNfts/WalletNftsTable'
import { isHighEffectiveApr } from 'src/utils/offers'
import { OfferExtended } from 'src/entities/app/OfferExtended'
import { CollectionStats } from 'src/entities/app/CollectionStats'
import { useWallet } from 'src/modules/wallet/useWallet'

export type UseGetALoanOffersColumnsParams = {
  nft: WalletNftsTableRow
}

export function useGetALoanOffersColumns({ nft }: UseGetALoanOffersColumnsParams) {
  const { t } = useTranslation()
  const { open } = useModals(Modals.StartLoan)
  const { getColumn } = useColumns<OfferExtended<CollectionStats>>()
  const { walletAddress } = useWallet()

  const handleAcceptOffer = useCallback((rowData: unknown) => {
    open({ nft, offerId: (rowData as Offer).id })
  }, [open, nft])

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
      getColumn({
        columnName: 'actionButton',
        headerTranslationKey: 'custom-table-columns.empty',
        key: 'Accept',
        getCellProps: row => {
          const isOwnOffer = Boolean(walletAddress && row.lender === walletAddress)
          return {
            rowData: row,
            buttonCopyTranslationKey: 'custom-table-columns.accept-cta',
            onClick: handleAcceptOffer,
            disabled: isOwnOffer,
            tooltipCopy: isOwnOffer
              ? 'borrow.accept-own-offer-disabled-tooltip'
              : undefined,
          }
        },
        overrides: { minWidth: 120, hideable: false },
      }),
    ],
    [getColumn, t, handleAcceptOffer, walletAddress]
  )

  return { columns }
}
