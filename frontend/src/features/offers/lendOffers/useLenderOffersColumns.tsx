import React, { useCallback, useMemo } from 'react'
import { Seconds } from 'src/entities/base/Seconds'
import { Offer } from 'src/entities/domain/Offer'
import { useColumns } from 'src/components/Tables/useColumns'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { getIsProratedOptionsDisplayText } from 'src/utils/terms'
import { isAssetOffer, isCollectionOffer, isContractOffer } from 'src/utils/offers'
import { useSoftDeleteOffer } from 'src/services/hooks/useSoftDeleteOffer'
import { useRevokeOffer } from 'src/services/hooks/useRevokeOffer'
import { useWallet } from 'src/modules/wallet/useWallet'
import { useAuth } from 'src/modules/auth/useAuth'
import { NotificationType, notify } from 'src/modules/notifications/notify'
import { SoftDeleteVsRevokeInfo } from '../manageOffers/SoftDeleteVsRevokeInfo'

export function useLenderOffersColumns() {
  const { t } = useTranslation()
  const { getColumn } = useColumns<Offer>()
  const { walletAddress } = useWallet()
  const { isAuthenticated, authorize } = useAuth()
  const { send: softDeleteOffer } = useSoftDeleteOffer()
  const { send: revokeOffer } = useRevokeOffer()

  const ensureAuthenticated = useCallback(async () => {
    if (!isAuthenticated) {
      await authorize()
    }
    return true
  }, [isAuthenticated, authorize])

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
          getCellProps: row => ({ percentage: row.terms.effectiveApr }),
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
        columnName: 'multiActionButton',
        columnInfoTooltip: <SoftDeleteVsRevokeInfo />,
        getCellProps: row => {
          const isLender = walletAddress && row.lender.toLowerCase() === walletAddress.toLowerCase()
          if (!isLender) {
            return { prioritisedActions: [], align: 'center' as const }
          }
          const actions = [
            {
              label: 'Soft delete',
              onClick: async () => {
                if (!(await ensureAuthenticated())) return
                const { success } = await softDeleteOffer(row.id)
                if (success) {
                  notify({ message: t('lend.offer-soft-deleted-successfully'), variant: NotificationType.Success })
                }
              },
            },
            {
              label: 'Hard delete',
              onClick: async () => {
                if (!(await ensureAuthenticated())) return
                const { success } = await revokeOffer(row)
                console.log('success revoke', success)
                if (success) {
                  notify({ message: t('lend.offer-revoked-successfully'), variant: NotificationType.Success })
                }
              },
            },
          ]
          return {
            prioritisedActions: actions,
            align: 'center' as const,
          }
        },
        overrides: {
          headerAlign: 'center',
          minWidth: 150,
          hideable: false,
        },
      }),
    ],
    [getColumn, t, walletAddress, ensureAuthenticated, softDeleteOffer, revokeOffer]
  )

  return { columns }
}
