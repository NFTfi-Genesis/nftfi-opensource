import React, { useCallback, useMemo } from 'react'
import { Box, useTheme } from '@mui/material'
import { getTestId } from 'src/utils/testing'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { useColumns } from 'src/components/Tables/useColumns'
import { Currency } from 'src/entities/domain/Currency'
import OpenseaLogo from 'src/assets/images/svg/opensea-logo.svg'
import { useModals } from 'src/modules/modals/useModals'
import { Modals } from 'src/modules/modals/Modals'
import { CollectionsTableRow } from './useCollectionsTableState'

export function useCollectionsColumns({ onViewOffers}:{ onViewOffers?: (collection: CollectionsTableRow) => void }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const { open: openMakeCollectionOfferModal } = useModals(Modals.MakeCollectionOffer)
  const { getColumn } = useColumns<CollectionsTableRow>()

  const handleMakeOffer = useCallback((row: CollectionsTableRow) => {
    return () => openMakeCollectionOfferModal({ collection: row })
  }, [openMakeCollectionOfferModal])

  const handleViewOffers = useCallback((row: CollectionsTableRow) => {
    return () => onViewOffers?.(row)
  }, [onViewOffers])

  const columns = useMemo(() => [
    getColumn({
      columnName: 'link',
      headerTranslationKey: 'custom-table-columns.link',
      getCellProps: row => {
        if (row.info.openseaSlug) {
          return {
            path: `https://opensea.io/collection/${row.info.openseaSlug}`,
            external: true,
            icon: (
              <Box
                component={OpenseaLogo}
                sx={{
                  width: 20,
                  height: 20,
                  color: theme.palette.grey[500],
                  transition: theme.transitions.create('color'),
                  '&:hover': {
                    color: theme.palette.common.white,
                  },
                }}
              />
            ),
          }
        }
        return {
          path: '',
          icon: null,
          show: false,
        }
      },
      overrides: {
        minWidth: 76,
        maxWidth: 76,
      },
    }),
    getColumn({
      columnName: 'collectionInfo',
      headerTranslationKey: 'custom-table-columns.collection',
      getCellProps: row => ({
        collection: row,
      }),
    }),
    getColumn({
      columnName: 'amount',
      headerTranslationKey: 'custom-table-columns.volume',
      getCellProps: row => ({
        amount: row.stats?.totalLoanAmount,
        currency: Currency.USD,
      }),
    }),
    getColumn({
      columnName: 'amount',
      headerTranslationKey: 'custom-table-columns.avg-loan-size',
      getCellProps: row => ({
        amount: row.stats?.avgLoanAmount,
        currency: Currency.USD,
      }),
      // serverSortableField: 'avgLoanAmount',
    }),
    getColumn({
      columnName: 'percentage',
      headerTranslationKey: 'custom-table-columns.avg-apr',
      getCellProps: row => ({
        percentage: row.stats?.avgApr,
      }),
    }),
    getColumn({
      columnName: 'numberWithSubtext',
      headerTranslationKey: 'custom-table-columns.loan-count',
      getCellProps: row => ({
        number: row.stats?.loanCount,
        subtext: t('custom-table-columns.loans'),
      }),
    }),
    getColumn({
      columnName: 'duration',
      headerTranslationKey: 'custom-table-columns.avg-duration',
      getCellProps: row => ({
        amount: row.stats?.avgDuration,
        unit: 'second',
      }),
    }),
    getColumn({
      columnName: 'multiActionButton',
      headerTranslationKey: 'custom-table-columns.empty',
      key: 'Actions',
      getCellProps: row => ({
        prioritisedActions: [
          { label: t('lend.make-offer'), onClick: handleMakeOffer(row), ...getTestId('lend.make-offer') },
          { label: t('borrow.view-offers'), onClick: handleViewOffers(row), ...getTestId('lend.view-offers') },
        ],
      }),
      overrides: {
        minWidth: 190,
      },
    })
  ],[getColumn, t, handleMakeOffer, handleViewOffers, theme])
  return { columns }
}
