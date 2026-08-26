import { GridDensity, GridColumnVisibilityModel } from '@mui/x-data-grid'
import { ThemeMode } from 'src/modules/theme/types'
import { Language } from 'src/modules/translation/config'
import { Address } from 'src/entities/base/Address'
import { ContactsSortDirection, ContactsSortType } from 'src/entities/domain/Contact'
import { DrawerType } from 'src/modules/drawers/DrawerType'
import { CollectionsFilters } from 'src/features/collections/useCollectionsTableState'
import { ListingsFilters } from 'src/services/fetchers/listing/getListings'
import { ManageOffersFilters } from 'src/features/offers/manageOffers/useManageOffersTableState'
import { WalletNftsFilters, WalletNftsStatusOptions } from 'src/features/nfts/walletNfts/types'
import { BorrowerLoansFilters } from 'src/features/market/tables/activeLoans/borrower/useBorrowerLoansTableState'
import { RefinancingLoansFilters } from 'src/features/market/tables/activeLoans/refinancing/useRefinancingLoansTableState'
import { HistoricalLoansFilters } from 'src/features/loansHistorical/useHistoricalLoansTableState'
import { Protocol } from 'src/entities/domain/Protocol'
import { GetKeyType, KeyWithSettings } from './types'

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000' as Address

// Configuring static keys:
// 1. Add the key to the LocalStorageKeys object
// The key could be a string or an object with key and settings properties.
// 2. Add the default value to the LocalStorageDefaults object

// Configuring dynamic keys:
// 1. Add the key to the LocalStorageKeys object.
// The key should be a function that returns a string, which is the actual key of the item in local storage, or an object with key and settings properties.
// 2. Add the value type to the LocalStorageValues type.
// The type should follow the pattern:
// [keyName: GetKeyType<typeof LocalStorageKeys.YourKey>]: valueType
// For nullable keys add | null to the type.

// Configuring keys with settings:
// The key should be an object or a function that returns an object (for dynamic keys) with the following properties:
// - key: string
// - settings: Settings
// Check types.ts for Settings definition.

// ------------------------------------------------------------

// This is a map of the LocalStorage item keys
// The key is how we reference the LS key in the code
// The value is the actual key of the item in local storage
export const LocalStorageKeys = {
  ThemeMode: 'themeMode',
  Language: 'language',
  DashboardUserPreferences: {
    NavigationExpanded: 'dashboardUserPreferences.navigationExpanded',
    OverviewExpanded: 'dashboardUserPreferences.overviewExpanded',
    ShowOverview: 'dashboardUserPreferences.showOverview',
  },
  MarketTablesViewPreferences: {
    Density: 'marketTablesViewPreferences.Density',
    BorrowersHiddenColumns: 'marketTablesViewPreferences.BorrowersHiddenColumns',
    LendersHiddenColumns: 'marketTablesViewPreferences.LendersHiddenColumns',
    ActiveLoansHiddenColumns: 'marketTablesViewPreferences.ActiveLoansHiddenColumns',
    WalletNftsHiddenColumns: 'marketTablesViewPreferences.WalletNftsHiddenColumns',
  },
  CollectionsTable: {
    Filters: 'collections.filters',
    Density: 'collections.density',
    HiddenColumns: 'collections.hiddenColumns',
  },
  ListingsTable: {
    Filters: 'listings.filters',
    Density: 'listings.density',
    HiddenColumns: 'listings.hiddenColumns',
  },
  ManageOffersTable: {
    Filters: 'manageOffers.filters',
    Density: 'manageOffers.density',
    HiddenColumns: 'manageOffers.hiddenColumns',
  },
  WalletNftsTable: {
    Filters: 'walletNfts.filters',
    Density: 'walletNfts.density',
    HiddenColumns: 'walletNfts.hiddenColumns',
  },
  BorrowerLoansTable: {
    Filters: 'borrowerLoans.filters',
    Density: 'borrowerLoans.density',
    HiddenColumns: 'borrowerLoans.hiddenColumns',
  },
  RefinancingLoansTable: {
    Filters: 'refinancingLoans.filters',
    Density: 'refinancingLoans.density',
    HiddenColumns: 'refinancingLoans.hiddenColumns',
  },
  OffersTable: {
    HiddenColumns: 'offers.hiddenColumns',
    Density: 'offers.density',
  },
  HistoricalBorrowerLoansTable: {
    Filters: 'historicalBorrowerLoans.filters',
    Density: 'historicalBorrowerLoans.density',
    HiddenColumns: 'historicalBorrowerLoans.hiddenColumns',
  },
  HistoricalLenderLoansTable: {
    Filters: 'historicalLenderLoans.filters',
    Density: 'historicalLenderLoans.density',
    HiddenColumns: 'historicalLenderLoans.hiddenColumns',
  },
  Contacts: {
    Sorting: {
      Type: 'contacts.sorting.type',
      Direction: 'contacts.sorting.direction',
    },
  },
  Drawers: {
    PinnedDrawer: 'drawers.pinnedDrawer',
  },
  Splits: {
    TestPageSplit: 'splits.testPageSplit',
    GetALoanSplit: 'splits.getALoanSplit',
    LoansSplit: 'splits.loansSplit',
    ListingsSplit: 'splits.listingsSplit',
    ManageOffersSplit: 'splits.manageOffersSplit',
  },
  Auth: {
    Token: (walletAddress: Address | null): KeyWithSettings<`jwtToken-${string}`> => ({
      key: `jwtToken-${walletAddress}`,
      settings: { serializeValue: false },
    }),
    RefreshToken: (walletAddress: Address | null): KeyWithSettings<`refreshToken-${string}`> => ({
      key: `refreshToken-${walletAddress}`,
      settings: { serializeValue: false },
    }),
  },
} as const

// Make sure to add a default value for each static key from LocalStorageKeys
// Example of adding default value for variable that can be null:
// [LocalStorageKeys.NullishKey]: null as string | null
// !IMPORTANT
// Don't define LocalStorageDefaults as const and don't define a type for LocalStorageDefaults object itself,
// it will break the type inference
export const LocalStorageDefaults = {
  [LocalStorageKeys.ThemeMode]: ThemeMode.dark,
  [LocalStorageKeys.Language]: Language.en,
  [LocalStorageKeys.DashboardUserPreferences.NavigationExpanded]: false,
  [LocalStorageKeys.DashboardUserPreferences.OverviewExpanded]: true,
  [LocalStorageKeys.DashboardUserPreferences.ShowOverview]: true,
  [LocalStorageKeys.MarketTablesViewPreferences.Density]: 'standard' as GridDensity,
  [LocalStorageKeys.MarketTablesViewPreferences.BorrowersHiddenColumns]: {} as GridColumnVisibilityModel,
  [LocalStorageKeys.MarketTablesViewPreferences.LendersHiddenColumns]: {} as GridColumnVisibilityModel,

  // Hide LoanContract and LoanId columns by default
  [LocalStorageKeys.MarketTablesViewPreferences.ActiveLoansHiddenColumns]: { LoanContract: false, LoanId: false } as GridColumnVisibilityModel,

  [LocalStorageKeys.MarketTablesViewPreferences.WalletNftsHiddenColumns]: {} as GridColumnVisibilityModel,
  [LocalStorageKeys.Contacts.Sorting.Type]: ContactsSortType.Alphabetically,
  [LocalStorageKeys.Contacts.Sorting.Direction]: ContactsSortDirection.Asc,
  [LocalStorageKeys.CollectionsTable.Filters]: {
    collections: [],
    avgLoanAmount: { min: null, max: null },
    totalLoanAmount: { min: null, max: null },
  } as CollectionsFilters,
  [LocalStorageKeys.CollectionsTable.Density]: 'standard' as GridDensity,
  [LocalStorageKeys.CollectionsTable.HiddenColumns]: {} as GridColumnVisibilityModel,
  [LocalStorageKeys.ListingsTable.Filters]: {
    collections: [],
    borrower: null,
    currency: null,
    duration: null,
  } as ListingsFilters,
  [LocalStorageKeys.ListingsTable.Density]: 'standard' as GridDensity,
  [LocalStorageKeys.ListingsTable.HiddenColumns]: {} as GridColumnVisibilityModel,
  [LocalStorageKeys.Drawers.PinnedDrawer]: null as DrawerType | null,
  [LocalStorageKeys.Splits.TestPageSplit]: 50,
  [LocalStorageKeys.Splits.GetALoanSplit]: 50,
  [LocalStorageKeys.Splits.LoansSplit]: 50,
  [LocalStorageKeys.Splits.ListingsSplit]: 50,
  [LocalStorageKeys.Splits.ManageOffersSplit]: 50,
  [LocalStorageKeys.ManageOffersTable.Filters]: {
    showCollectionOffersOnly: false,
    currency: null,
    principalRange: [0, 0],
    isProRated: null,
    maxApr: 0,
    withoutOriginationFee: false,
    activeLoansOnly: false,
    duration: 0,
    borrowerAddress: null,
    collections: [],
  } as ManageOffersFilters,
  [LocalStorageKeys.ManageOffersTable.Density]: 'standard' as GridDensity,
  [LocalStorageKeys.ManageOffersTable.HiddenColumns]: {} as GridColumnVisibilityModel,
  [LocalStorageKeys.WalletNftsTable.Filters]: {
    collection: [],
    status: WalletNftsStatusOptions.Any,
  } as WalletNftsFilters,
  [LocalStorageKeys.WalletNftsTable.Density]: 'standard' as GridDensity,
  [LocalStorageKeys.WalletNftsTable.HiddenColumns]: {} as GridColumnVisibilityModel,
  [LocalStorageKeys.BorrowerLoansTable.Filters]: {
    onlyNftfi: false,
    protocol: [],
    collections: [],
    borrower: NULL_ADDRESS,
    currency: [],
    dueWithin: null,
  } as BorrowerLoansFilters,
  [LocalStorageKeys.BorrowerLoansTable.Density]: 'standard' as GridDensity,
  [LocalStorageKeys.BorrowerLoansTable.HiddenColumns]: { LoanContract: false, LoanId: false } as GridColumnVisibilityModel,
  [LocalStorageKeys.RefinancingLoansTable.Filters]: {
    collections: [],
    currency: [],
    dueWithin: null,
    wallets: [],
    protocol: [Protocol.Nftfi, Protocol.Gondi],
  } as RefinancingLoansFilters,
  [LocalStorageKeys.RefinancingLoansTable.Density]: 'standard' as GridDensity,
  [LocalStorageKeys.RefinancingLoansTable.HiddenColumns]: { LoanContract: false, LoanId: false } as GridColumnVisibilityModel,
  [LocalStorageKeys.OffersTable.HiddenColumns]: { offerType: false } as GridColumnVisibilityModel,
  [LocalStorageKeys.OffersTable.Density]: 'standard' as GridDensity,
  [LocalStorageKeys.HistoricalBorrowerLoansTable.Filters]: {
    statuses: [],
  } as HistoricalLoansFilters,
  [LocalStorageKeys.HistoricalBorrowerLoansTable.Density]: 'standard' as GridDensity,
  [LocalStorageKeys.HistoricalBorrowerLoansTable.HiddenColumns]: {} as GridColumnVisibilityModel,
  [LocalStorageKeys.HistoricalLenderLoansTable.Filters]: {
    statuses: [],
  } as HistoricalLoansFilters,
  [LocalStorageKeys.HistoricalLenderLoansTable.Density]: 'standard' as GridDensity,
  [LocalStorageKeys.HistoricalLenderLoansTable.HiddenColumns]: {} as GridColumnVisibilityModel,
}

// This type defines the value type for each key that does not have a default value
// Dynamic keys can't have a default value, so the value type for dynamic keys must be always defined here
export type LocalStorageValues = typeof LocalStorageDefaults & {
  [jwtTokenKey: GetKeyType<typeof LocalStorageKeys.Auth.Token>]: string | null
  [refreshTokenKey: GetKeyType<typeof LocalStorageKeys.Auth.RefreshToken>]: string | null
}
