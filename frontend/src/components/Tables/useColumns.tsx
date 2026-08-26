import { useMemo } from 'react'
import { GridColDef } from '@mui/x-data-grid'

import { useTranslation } from 'src/modules/translation/useTranslation'
import { TKey } from 'src/modules/translation/TKey'
import {
  AmountCell,
  type AmountCellProps,
} from 'src/components/Tables/Cells/AmountCell'
import {
  PercentageCell,
  type PercentageCellProps,
} from 'src/components/Tables/Cells/PercentageCell'
import {
  DurationDaysCell,
  type DurationDaysCellProps,
} from 'src/components/Tables/Cells/DurationDaysCell'
import {
  LinkCell,
  type LinkCellProps,
} from 'src/components/Tables/Cells/LinkCell'
import {
  OfferStatusCell,
  type OfferStatusCellProps,
} from 'src/components/Tables/Cells/OfferStatusCell'
import {
  RelativeDateCell,
  RelativeDateCellProps,
} from 'src/components/Tables/Cells/RelativeDateCell'
import {
  LogoCell,
  LogoCellProps,
} from 'src/components/Tables/Cells/LogoCell'
import {
  TextWithSubtextCell,
  type TextWithSubtextCellProps,
} from './Cells/TextWithSubtextCell'
import {
  UserAddressLargeCell,
  type UserAddressLargeCellProps,
} from './Cells/UserAddressLargeCell'
import {
  UserAddressCell,
  type UserAddressCellProps,
} from './Cells/UserAddressCell'
import { ServerSortableColumn } from './TableBase'
import { NftInfoCell, NftInfoCellProps } from './Cells/NftInfoCell'
import {
  SetAllowanceCell,
  SetAllowanceCellProps,
} from './Cells/SetAllowanceCell'
import {
  NumberWithSubtextCell,
  type NumberWithSubtextCellProps,
} from './Cells/NumberWithSubtextCell'
import {
  TimeRemainingCell,
  TimeRemainingCellProps,
} from './Cells/TimeRemainingCell'
import { DateCell, DateCellProps } from './Cells/DateCell'
import {
  RelativeAndFormattedDateCell,
  RelativeAndFormattedDateCellProps,
} from './Cells/RelativeAndFormattedDateCell'
import { PercentageChangeCell, PercentageChangeCellProps } from './Cells/PercentageChangeCell'
import { AllowanceCell, AllowanceCellProps } from './Cells/AllowanceCell'
import { ContractAddressCell, ContractAddressCellProps } from './Cells/ContractAddressCell'
import { LoanOffersCell, LoanOffersCellProps } from './Cells/LoanOffersCell'
import { ListingStatusCell, ListingStatusCellProps } from './Cells/ListedCell'
import {
  MultiActionButtonCell,
  type MultiActionButtonCellProps,
} from './Cells/MultiActionButtonCell'
import {
  ActionButtonCell,
  type ActionButtonCellProps,
} from './Cells/ActionButtonCell'
import { AssetOrCollectionInfoCell, AssetOrCollectionInfoCellProps } from './Cells/AssetOrCollectionInfoCell'
import { OfferInfoCell, OfferInfoCellProps } from './Cells/OfferInfoCell'
import { CollectionInfoCell, CollectionInfoCellProps } from './Cells/CollectionInfoCell'

// TODO: Make column names an enum, as it's easier to pick the column when it's an enum not a string when using the getColumn function
type ColumnNameCellPropsMap = {
  address: UserAddressCellProps
  contractAddress: ContractAddressCellProps
  addressLarge: UserAddressLargeCellProps
  textWithSubtext: TextWithSubtextCellProps
  remainingAllowance: AllowanceCellProps
  setAllowance: SetAllowanceCellProps
  amount: AmountCellProps
  percentage: PercentageCellProps
  duration: DurationDaysCellProps
  relativeDate: RelativeDateCellProps
  offerStatus: OfferStatusCellProps
  // TODO: Add "button" column
  link: LinkCellProps
  logo: LogoCellProps
  assetInfoDashboard: NftInfoCellProps
  assetInfo: NftInfoCellProps
  assetOrCollectionInfo: AssetOrCollectionInfoCellProps
  offerInfo: OfferInfoCellProps
  collectionInfo: CollectionInfoCellProps
  numberWithSubtext: NumberWithSubtextCellProps
  timeRemaining: TimeRemainingCellProps
  date: DateCellProps
  relativeAndFormattedDate: RelativeAndFormattedDateCellProps
  ltv: PercentageChangeCellProps
  loanOffers: LoanOffersCellProps
  listingStatus: ListingStatusCellProps
  multiActionButton: MultiActionButtonCellProps
  actionButton: ActionButtonCellProps
}

export function useColumns<TRowData extends Record<string, unknown>>() {
  const { t } = useTranslation()

  const baseColumn: {
    [TColumnName in keyof ColumnNameCellPropsMap]: (
      getCellProps: (row: TRowData) => ColumnNameCellPropsMap[TColumnName],
      headerTranslationKey?: TKey,
      key?: string
    ) => GridColDef<TRowData>
  } = useMemo(
    () => ({
      amount: (getCellProps, headerTranslationKey, key) => ({
        field: key || t(headerTranslationKey || 'custom-table-columns.amount'),
        headerName: t(headerTranslationKey || 'custom-table-columns.amount'),
        minWidth: 110,
        flex: 1,
        display: 'flex',
        align: 'right',
        headerAlign: 'right',
        renderCell: params => <AmountCell {...getCellProps(params.row)} />,
      }),
      percentage: (getCellProps, headerTranslationKey, key) => ({
        field: key || t(headerTranslationKey || 'custom-table-columns.apr'),
        headerName: t(headerTranslationKey || 'custom-table-columns.apr'),
        minWidth: 100,
        flex: 1,
        align: 'right',
        headerAlign: 'right',
        renderCell: params => <PercentageCell {...getCellProps(params.row)} />,
      }),
      ltv: (getCellProps, headerTranslationKey, key) => ({
        field: key || t(headerTranslationKey || 'custom-table-columns.ltv'),
        headerName: t(headerTranslationKey || 'custom-table-columns.ltv'),
        minWidth: 100,
        flex: 1,
        align: 'right',
        headerAlign: 'right',
        renderCell: params => <PercentageChangeCell {...getCellProps(params.row)} />,
      }),
      duration: (getCellProps, headerTranslationKey, key) => ({
        field:
          key || t(headerTranslationKey || 'custom-table-columns.duration'),
        headerName: t(headerTranslationKey || 'custom-table-columns.duration'),
        minWidth: 90,
        flex: 1,
        align: 'right',
        headerAlign: 'right',
        renderCell: params => (
          <DurationDaysCell {...getCellProps(params.row)} />
        ),
      }),
      relativeDate: (getCellProps, headerTranslationKey, key) => ({
        field:
          key || t(headerTranslationKey || 'custom-table-columns.duration'),
        headerName: t(headerTranslationKey || 'custom-table-columns.duration'),
        minWidth: 90,
        flex: 1,
        align: 'right',
        headerAlign: 'right',
        renderCell: params => (
          <RelativeDateCell {...getCellProps(params.row)} />
        ),
      }),
      offerStatus: (getCellProps, headerTranslationKey, key) => ({
        field: key || t(headerTranslationKey || 'custom-table-columns.offer-status'),
        headerName: t(headerTranslationKey || 'custom-table-columns.offer-status'),
        minWidth: 100,
        flex: 1,
        align: 'right',
        headerAlign: 'right',
        renderCell: params => <OfferStatusCell {...getCellProps(params.row)} />,
      }),
      link: (getCellProps, headerTranslationKey, key) => ({
        field: key || t(headerTranslationKey || 'custom-table-columns.link'),
        headerName: t(headerTranslationKey || 'custom-table-columns.link'),
        minWidth: 90,
        flex: 1,
        cellClassName: 'sticky-right-cell',
        renderCell: params => <LinkCell {...getCellProps(params.row)} />,
      }),
      logo: (getCellProps, headerTranslationKey, key) => ({
        field: key || t(headerTranslationKey || 'custom-table-columns.logo'),
        headerName: t(headerTranslationKey || 'custom-table-columns.logo'),
        minWidth: 80,
        maxWidth: 80,
        align: 'center',
        headerAlign: 'center',
        headerClassName: 'logo-header',
        renderCell: params => <LogoCell {...getCellProps(params.row)} />,
      }),
      textWithSubtext: (getCellProps, headerTranslationKey, key) => ({
        field:
          key
          || t(headerTranslationKey || 'custom-table-columns.nftfi-contract'),
        headerName: t(
          headerTranslationKey || 'custom-table-columns.nftfi-contract'
        ),
        minWidth: 230,
        flex: 1,
        renderCell: params => (
          <TextWithSubtextCell {...getCellProps(params.row)} />
        ),
      }),
      address: (getCellProps, headerTranslationKey, key) => ({
        field:
          key
          || t(headerTranslationKey || 'custom-table-columns.contract-address'),
        headerName: t(
          headerTranslationKey || 'custom-table-columns.contract-address'
        ),
        minWidth: 90,
        flex: 1,
        headerAlign: 'left',
        renderCell: params => <UserAddressCell {...getCellProps(params.row)} />,
      }),
      addressLarge: (getCellProps, headerTranslationKey, key) => ({
        field:
          key
          || t(headerTranslationKey || 'custom-table-columns.contract-address'),
        headerName: t(
          headerTranslationKey || 'custom-table-columns.contract-address'
        ),
        minWidth: 490,
        flex: 1,
        align: 'left',
        headerAlign: 'left',
        renderCell: params => (
          <UserAddressLargeCell {...getCellProps(params.row)} />
        ),
      }),
      contractAddress: (getCellProps, headerTranslationKey, key) => ({
        field:
          key
          || t(headerTranslationKey || 'custom-table-columns.contract-address'),
        headerName: t(
          headerTranslationKey || 'custom-table-columns.contract-address'
        ),
        minWidth: 430,
        flex: 1,
        headerAlign: 'left',
        renderCell: params => <ContractAddressCell {...getCellProps(params.row)} />,
      }),
      remainingAllowance: (getCellProps, headerTranslationKey, key) => ({
        field:
          key
          || t(headerTranslationKey || 'custom-table-columns.remaining-allowance'),
        headerName: t(
          headerTranslationKey || 'custom-table-columns.remaining-allowance'
        ),
        minWidth: 90,
        flex: 1,
        type: 'number',
        renderCell: params => <AllowanceCell {...getCellProps(params.row)} />,
      }),
      setAllowance: (getCellProps, headerTranslationKey, key) => ({
        field:
          key
          || t(headerTranslationKey || 'custom-table-columns.set-allowance'),
        headerName: t(
          headerTranslationKey || 'custom-table-columns.set-allowance'
        ),
        minWidth: 202,
        flex: 1,
        renderCell: params => (
          <SetAllowanceCell {...getCellProps(params.row)} />
        ),
      }),
      assetInfo: (getCellProps, headerTranslationKey, key) => ({
        field: key || t(headerTranslationKey || 'custom-table-columns.asset'),
        headerName: t(
          headerTranslationKey || 'custom-table-columns.asset-info'
        ),
        minWidth: 300,
        flex: 1,
        renderCell: params => <NftInfoCell {...getCellProps(params.row)} />,
      }),
      collectionInfo: (getCellProps, headerTranslationKey, key) => ({
        field: key || t(headerTranslationKey || 'custom-table-columns.collection'),
        headerName: t(headerTranslationKey || 'custom-table-columns.collection'),
        minWidth: 300,
        flex: 1,
        renderCell: params => <CollectionInfoCell {...getCellProps(params.row)} />,
      }),
      assetInfoDashboard: (getCellProps, headerTranslationKey, key) => ({
        field: key || t(headerTranslationKey || 'custom-table-columns.asset'),
        headerName: t(
          headerTranslationKey || 'custom-table-columns.asset-info'
        ),
        minWidth: 300,
        renderCell: params => (
          <NftInfoCell {...getCellProps(params.row)} />
        ),
      }),
      assetOrCollectionInfo: (getCellProps, headerTranslationKey, key) => ({
        field: key || t(headerTranslationKey || 'custom-table-columns.asset-or-collection'),
        headerName: t(headerTranslationKey || 'custom-table-columns.asset-or-collection'),
        minWidth: 300,
        flex: 1,
        renderCell: params => <AssetOrCollectionInfoCell {...getCellProps(params.row)} />
      }),
      offerInfo: (getCellProps, headerTranslationKey, key) => ({
        field: key || t(headerTranslationKey || 'custom-table-columns.asset-or-collection'),
        headerName: t(headerTranslationKey || 'custom-table-columns.asset-or-collection'),
        minWidth: 300,
        flex: 1,
        renderCell: params => <OfferInfoCell {...getCellProps(params.row)} />,
      }),
      numberWithSubtext: (getCellProps, headerTranslationKey, key) => ({
        field:
          key
          || t(headerTranslationKey || 'custom-table-columns.number-with-subtext'),
        headerName: t(headerTranslationKey || 'custom-table-columns.amount'),
        minWidth: 130,
        flex: 1,
        align: 'right',
        headerAlign: 'right',
        renderCell: params => (
          <NumberWithSubtextCell {...getCellProps(params.row)} />
        ),
      }),
      timeRemaining: (getCellProps, headerTranslationKey, key) => ({
        field: key || t(headerTranslationKey || 'custom-table-columns.due-in'),
        headerName: t(headerTranslationKey || 'custom-table-columns.due-in'),
        minWidth: 130,
        flex: 1,
        align: 'right',
        headerAlign: 'right',
        renderCell: params => (
          <TimeRemainingCell {...getCellProps(params.row)} />
        ),
      }),
      date: (getCellProps, headerTranslationKey, key) => ({
        field: key || t(headerTranslationKey || 'custom-table-columns.date'),
        headerName: t(headerTranslationKey || 'custom-table-columns.date'),
        minWidth: 130,
        flex: 1,
        align: 'right',
        headerAlign: 'right',
        renderCell: params => <DateCell {...getCellProps(params.row)} />,
      }),
      relativeAndFormattedDate: (getCellProps, headerTranslationKey, key) => ({
        field: key || t(headerTranslationKey || 'custom-table-columns.date'),
        headerName: t(headerTranslationKey || 'custom-table-columns.date'),
        minWidth: 150,
        flex: 1,
        align: 'right',
        headerAlign: 'right',
        renderCell: params => (
          <RelativeAndFormattedDateCell {...getCellProps(params.row)} />
        ),
      }),
      loanOffers: (getCellProps, headerTranslationKey, key) => ({
        field: key || t((headerTranslationKey || 'custom-table-columns.loan-offers')),
        headerName: t((headerTranslationKey || 'custom-table-columns.loan-offers')),
        minWidth: 110,
        flex: 1,
        align: 'right',
        headerAlign: 'right',
        renderCell: params => <LoanOffersCell {...getCellProps(params.row)} />,
      }),
      listingStatus: (getCellProps, headerTranslationKey, key) => ({
        field: key || t((headerTranslationKey || 'custom-table-columns.listed')),
        headerName: t((headerTranslationKey || 'custom-table-columns.listed')),
        minWidth: 100,
        flex: 1,
        align: 'left',
        headerAlign: 'left',
        renderCell: params => <ListingStatusCell {...getCellProps(params.row)} />,
      }),
      multiActionButton: (getCellProps, headerTranslationKey, key) => ({
        field: key || t(headerTranslationKey || 'custom-table-columns.empty'),
        headerName: t(headerTranslationKey || 'custom-table-columns.empty'),
        minWidth: 90,
        flex: 1,
        align: 'right',
        headerAlign: 'right',
        cellClassName: 'sticky-right-cell-minimise',
        renderCell: params => (
          <MultiActionButtonCell {...getCellProps(params.row)} />
        ),
      }),
      actionButton: (getCellProps, headerTranslationKey, key) => ({
        field: key || t(headerTranslationKey || 'custom-table-columns.empty'),
        headerName: t(headerTranslationKey || 'custom-table-columns.empty'),
        minWidth: 90,
        flex: 1,
        cellClassName: 'sticky-right-cell',
        renderCell: params => (
          <ActionButtonCell {...getCellProps(params.row)} />
        ),
      }),
    }),
    [t]
  )

  type GetColumn = <TColumnName extends keyof ColumnNameCellPropsMap>(params: {
    columnName: TColumnName
    headerTranslationKey?: TKey
    key?: string
    getCellProps: (row: TRowData) => ColumnNameCellPropsMap[TColumnName]
    serverSortableField?: string
    columnInfoTooltip?: React.ReactNode
    overrides?: Partial<GridColDef<TRowData>>
  }) => ServerSortableColumn<TRowData>

  const getColumn: GetColumn = useMemo(
    () =>
      ({
        columnName,
        headerTranslationKey,
        key,
        getCellProps,
        serverSortableField,
        columnInfoTooltip,
        overrides = {},
      }) => {
        const baseColumnDef = baseColumn[columnName](
          getCellProps,
          headerTranslationKey,
          key
        )

        const column: ServerSortableColumn<TRowData> = {
          ...baseColumnDef,
          ...overrides,
        }

        if (serverSortableField) {
          column.serverSortableField = serverSortableField
        }

        if (columnInfoTooltip) {
          column.columnInfoTooltip = columnInfoTooltip
        }

        return column
      },
    [baseColumn]
  )

  return { getColumn }
}
