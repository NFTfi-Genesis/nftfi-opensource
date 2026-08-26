import { useMemo } from 'react'
import { useColumns } from 'src/components/Tables/useColumns'
import { AssetOfferExtended, CollectionOfferExtended, ContractOfferExtended } from 'src/entities/app/OfferExtended'
import { OfferValidated } from 'src/entities/app/OfferValidated'
import { isAssetOffer, isCollectionOffer, isContractOffer } from 'src/utils/offers'
import { useSoftDeleteOffer } from 'src/services/hooks/useSoftDeleteOffer'
import { useRevokeOffer } from 'src/services/hooks/useRevokeOffer'
import { secondsToDays } from 'src/utils/time'
import { isZeroAddress } from 'src/utils/address'
import { NotificationType, notify } from 'src/modules/notifications/notify'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { SoftDeleteVsRevokeInfo } from './SoftDeleteVsRevokeInfo'

export function useManageOffersColumns() {
  const { t } = useTranslation()
  const { getColumn } = useColumns<
    | AssetOfferExtended<OfferValidated>
    | CollectionOfferExtended<OfferValidated>
    | ContractOfferExtended<OfferValidated>
  >()
  const { send: softDeleteOffer } = useSoftDeleteOffer()
  const { send: revokeOffer } = useRevokeOffer()

  const columns = useMemo(() => [
    getColumn({
      columnName: 'offerInfo',
      headerTranslationKey: 'custom-table-columns.asset-or-collection',
      getCellProps: row => ({
        offer: row,
      }),
      overrides: {
        minWidth: 250,
        sortable: false,
      },
    }),
    getColumn({
      columnName: 'amount',
      headerTranslationKey: 'custom-table-columns.principal',
      getCellProps: row => ({
        weiAmount: row.terms.principal,
        currency: row.terms.currency,
      }),
      serverSortableField: 'principal',
      overrides: {
        sortable: false,
        hideable: false,
      }
    }),
    getColumn({
      columnName: 'amount',
      headerTranslationKey: 'custom-table-columns.repayment',
      getCellProps: row => ({
        weiAmount: row.terms.repayment,
        currency: row.terms.currency,
      }),
      serverSortableField: 'repayment',
      overrides: {
        minWidth: 130,
        sortable: false,
      }
    }),
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
      serverSortableField: 'loanType',
      overrides: {
        minWidth: 120,
        headerAlign: 'right',
        align: 'right',
        sortable: false,
      },
    }),
    getColumn({
      columnName: 'percentage',
      headerTranslationKey: 'custom-table-columns.apr',
      getCellProps: row => ({
        percentage: row.terms.apr,
      }),
      serverSortableField: 'apr',
      overrides: {
        sortable: false,
      }
    }),
    getColumn({
      columnName: 'amount',
      headerTranslationKey: 'custom-table-columns.origination',
      getCellProps: row => ({
        weiAmount: row.terms.origination,
        currency: row.terms.currency,
      }),
      serverSortableField: 'origination',
      overrides: {
        minWidth: 150,
        sortable: false,
      },
    }),
    getColumn({
      columnName: 'percentage',
      headerTranslationKey: 'custom-table-columns.effective-apr',
      getCellProps: row => ({
        percentage: row.terms.effectiveApr,
      }),
      serverSortableField: 'effectiveApr',
      overrides: {
        minWidth: 140,
        sortable: false,
      },
    }),
    getColumn({
      columnName: 'duration',
      headerTranslationKey: 'custom-table-columns.duration',
      getCellProps: row => ({
        // TODO: use secondsToDays()
        amount: secondsToDays(row.terms.duration),
      }),
      serverSortableField: 'duration',
      overrides: {
        minWidth: 110,
        headerAlign: 'right',
        align: 'right',
        sortable: false,
      },
    }),
    getColumn({
      columnName: 'relativeDate',
      headerTranslationKey: 'custom-table-columns.expires-in',
      getCellProps: row => ({
        date: new Date(row.expiry * 1000),
      }),
      serverSortableField: 'expiry',
      overrides: {
        minWidth: 120,
        sortable: false,
      },
    }),
    getColumn({
      columnName: 'address',
      headerTranslationKey: 'custom-table-columns.borrower',
      getCellProps: row => ({
        address: row.borrower && !isZeroAddress(row.borrower)
          ? row.borrower
          : null,
        fallback: 'n/a',
        align: 'right',
      }),
      overrides: {
        minWidth: 120,
        headerAlign: 'right',
        sortable: false,
      },
    }),
    getColumn({
      columnName: 'offerStatus',
      headerTranslationKey: 'custom-table-columns.offer-status',
      getCellProps: row => ({
        offer: row,
      }),
      serverSortableField: 'offerStatus',
      overrides: {
        minWidth: 150,
        sortable: false,
      },
    }),
    getColumn({
      columnName: 'multiActionButton',
      columnInfoTooltip: <SoftDeleteVsRevokeInfo />,
      getCellProps: row => {
        const actions = [
          {
            label: 'Hard delete',
            onClick: async () => {
              const { success } = await revokeOffer(row)
              if (success) {
                notify({ message: t('lend.offer-revoked-successfully'), variant: NotificationType.Success })
              }
            },
          },
        ]
        if (!row.isDeleted) {
          actions.unshift({
            label: 'Soft delete',
            onClick: async () => {
              const { success } = await softDeleteOffer(row.id)
              if (success) {
                notify({ message: t('lend.offer-soft-deleted-successfully'), variant: NotificationType.Success })
              }
            },
          })
        }
        return {
          prioritisedActions: actions,
          align: 'center',
        }
      },
      overrides: {
        headerAlign: 'center',
        minWidth: 150,
        hideable: false,
        sortable: false,
      },
    }),
  ], [getColumn, softDeleteOffer, revokeOffer, t])
  return columns
}
