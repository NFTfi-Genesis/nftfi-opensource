import { Address } from 'src/entities/base/Address'
import { Currency } from 'src/entities/domain/Currency'
import { getCurrencyTicker } from 'src/utils/currencies'
import { Nft } from 'src/entities/domain/Nft'
import { Collection } from 'src/entities/domain/Collection'
import { jsonStringify } from 'src/utils/json'
import { GetWhitelistedCollectionsParams } from '../fetchers/collection/getWhitelistedCollections'
import { GetListingsParams } from '../fetchers/listing/getListings'
import { GetLoansParams } from '../fetchers/loan/getLoans'
import { dataKey, dataKeyWithNamespace, namespace } from './utils'

// TODO: make better structure with namespaces
export const DataKeys = {
  balance: (currency: Currency, address: Address | null) => dataKey`balance-${getCurrencyTicker(currency)}-${address}`,
  allowance: (currency: Currency, address: Address | null, spender: Address) => dataKey`allowance-${getCurrencyTicker(currency)}-${address}-${spender}`,
  nftApproval: (contractAddress: Address, owner: Address | null, operator: Address, tokenId?: bigint) => dataKey`nft-approval-${contractAddress}-${owner}-${operator}${tokenId
    ? `-${tokenId}`
    : ''}`,
  isORMinted: (loanId: number, owner: Address | null) => dataKey`is-or-minted-${loanId}-${owner}`,
  gasPrice: () => dataKey`gas-price`,
  fxRate: () => dataKey`fx-rate`,
  gondiRepaymentSignature: (hash?: string) => dataKey`gondi-repayment-signature-${hash}`,

  walletNfts: (address: Address | null) => dataKey`wallet-nfts-${address}`,

  listingsBorrow: (address: Address | null) => dataKeyWithNamespace('listings')`${address}`,
  listingsLend: (params: GetListingsParams | null) => dataKeyWithNamespace('listings')`${params
    ? jsonStringify(params)
    : null}`,

  loansByBorrower: (address: Address | null) => dataKeyWithNamespace('loans')`${address}`,
  loans: (params: GetLoansParams) => dataKeyWithNamespace('loans')`${JSON.stringify(params)}`,

  loanExtensionOfferForLoan: (loanContract: string | null, loanId: number | null) => dataKeyWithNamespace('loanExtensionOffers')`${loanContract}-${loanId}`,

  auth: (address: Address | null) => dataKey`auth-${address}`,
  account: (address: Address | null) => dataKey`account-${address}`,
  sanctioned: (address: Address | null) => dataKey`sanctioned-${address}`,
  contacts: (address: Address | null) => dataKey`contacts-${address}`,

  offersForNft: (nft: Nft) => dataKeyWithNamespace('offers')`${nft.id}-${nft.address}`,
  offersForCollection: (collection: Collection) => dataKeyWithNamespace('offers')`collection-${collection.address}:${collection.start}`,
  offersByLender: (address: Address | null) => dataKeyWithNamespace('offers')`${address}`,

  whitelistedCollections: (params: GetWhitelistedCollectionsParams | null) => dataKey`whitelisted-collections-${params
    ? jsonStringify(params)
    : null}`,
  activeCollections: (qs: string) => dataKey`active-collections-${qs}`,
  borrowerStats: (qs: string) => dataKey`borrower-stats-${qs}`,
  lenderStats: (qs: string) => dataKey`lender-stats-${qs}`,
  walletLoansStats: (address: Address | null) => dataKey`wallet-loans-stats-${address}`,
  loansCurrencyBreakdown: (qs: string) => dataKey`loans-currency-breakdown-${qs}`,
  loansProtocolBreakdown: (qs: string) => dataKey`loans-protocol-breakdown-${qs}`,
  collectionLoansStats: (qs: string) => dataKey`collection-loans-stats-${qs}`,
  dueDateLoansStats: (qs: string) => dataKey`due-date-loans-stats-${qs}`,
  loansOverviewInfo: (qs: string) => dataKey`loans-overview-info-${qs}`,

  borrowerCollections: (address: Address, protocols?: string[]) => dataKey`borrower-collections-${address}-${protocols?.join(',') ?? ''}`,

  allWhitelistedCollections: () => dataKey`all-whitelisted-collections`,

  nftMarketInfo: (nft: Nft) => dataKey`nft-market-info-${nft.address}-${nft.id}`,
  collectionMarketInfo: (collection: Collection) => dataKey`collection-market-info-${collection.address}`,
}

export const DataKeyMatchers = {
  ...DataKeys,

  offersAll: () => namespace('offers'),
  loansAll: () => namespace('loans'),
  listingsAll: () => namespace('listings'),
  loanExtensionOffersAll: () => namespace('loanExtensionOffers'),
}
