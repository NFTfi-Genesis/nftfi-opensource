import { Address } from 'src/entities/base/Address'
import { Loan, LoansSortBy, LoanStatus } from 'src/entities/domain/Loan'
import { Protocol } from 'src/entities/domain/Protocol'
import { Wei } from 'src/entities/base/Wei'
import { Percentage } from 'src/entities/base/Percentage'
import { Seconds } from 'src/entities/base/Seconds'
import { ISOStringDate } from 'src/entities/base/ISOStringDate'
import { getCurrencyFromAddress, getCurrencyAddress } from 'src/utils/currencies'
import { getLoanStatus } from 'src/utils/loans'
import { getProtocolFromName, ProtocolApiKeys } from 'src/utils/protocols'
import { PanicError } from 'src/errors/PanicError'
import { PaginationParams } from 'src/entities/app/PaginationParams'
import { EntitiesPaginated } from 'src/entities/utils/EntitiesPaginated'
import { Currency } from 'src/entities/domain/Currency'
import { CollectionId } from 'src/entities/domain/Collection'
import { DueWithin } from 'src/utils/dueWithin'
import { SortOrder, SortParams } from 'src/entities/app/SortParams'
import { AuthMode } from '../../types/AuthMode'
import { createNftfiApiFetcher } from '../../factories/nftfiApi/createNftfiApiFetcher'

/** API-supported sort fields: principal, repayment, repaymentMax, apr, duration, startedAt, dueAt */
const LOANS_SORT_BY_MAP: Partial<Record<LoansSortBy, 'principal' | 'repayment' | 'repaymentMax' | 'apr' | 'duration' | 'startedAt' | 'dueAt'>> = {
  [LoansSortBy.principalAmount]: 'principal',
  [LoansSortBy.maximumRepaymentAmount]: 'repaymentMax',
  [LoansSortBy.apr]: 'apr',
  [LoansSortBy.durationDays]: 'duration',
  [LoansSortBy.startTime]: 'startedAt',
  [LoansSortBy.dueTime]: 'dueAt',
  [LoansSortBy.secondsUntilDue]: 'dueAt',
}

const STATUS_API_VALUE: Record<LoanStatus, string> = {
  [LoanStatus.Active]: 'active',
  [LoanStatus.Repaid]: 'repaid',
  [LoanStatus.Liquidated]: 'liquidated',
  [LoanStatus.Defaulted]: 'defaulted',
}

type LoansApiResponse = Array<{
  id: number
  loanId: string
  contract: string
  contractName: string
  protocol: string
  status: string
  asset: {
    contract: string
    owners: string[]
    tokenId: string
    name: string
    imageSmallUrl: string
    imageMediumUrl: string
    collection: {
      id: number
      contract: string
      tokenRange: string
      tokenSupply: string
      tokenStandard: string
      name: string
      ranking: number
      imageUrl: string
      whitelisted: boolean
      openseaSlug: string
      floor: number | null
      stats: unknown | null
    }
  }
  borrower: string
  lender: string
  currency: Address
  principal: string
  repayment: string
  repaymentMax: string
  interest: string
  originationFee: string
  adminFee: string
  apr: number
  eapr: number
  prorated: boolean
  duration: number
  startedAt: ISOStringDate
  dueAt: ISOStringDate
  endedAt: ISOStringDate | null
}>

const loansFetcher = createNftfiApiFetcher<LoansApiResponse, AuthMode.None, true>({
  authMode: AuthMode.None,
  includeHeaders: true,
})

export type GetLoansParams = {
  pagination?: PaginationParams
  filters: {
    borrower?: Address
    lender?: Address
    wallets?: Address[]
    protocols?: Protocol[]
    collectionIds?: CollectionId[]
    currency?: Currency[]
    dueWithin?: DueWithin | null
    statuses?: LoanStatus[]
  }
  sort?: SortParams<LoansSortBy>
}

function serializeLoansParams(params: GetLoansParams): string {
  const qs = new URLSearchParams()

  qs.set('page', ((params.pagination?.page ?? 0) + 1).toString())
  qs.set('limit', (params.pagination?.pageSize ?? 25).toString())
  const statuses = params.filters.statuses?.length ? params.filters.statuses : [LoanStatus.Active]
  qs.set('statuses', statuses.map(s => STATUS_API_VALUE[s]).join(','))

  if (params.filters.borrower) {
    qs.set('borrower', params.filters.borrower)
  }

  if (params.filters.lender) {
    qs.set('lender', params.filters.lender)
  }

  if (params.filters.wallets && params.filters.wallets.length > 0) {
    qs.set('wallets', params.filters.wallets.join(','))
  }

  if (params.filters.protocols && params.filters.protocols.length > 0) {
    qs.set('protocols', params.filters.protocols.map(p => ProtocolApiKeys[p]).join(','))
  }

  const sortBy = params.sort
    ? LOANS_SORT_BY_MAP[params.sort.sortBy as LoansSortBy] ?? 'dueAt'
    : 'dueAt'
  const sortDirection = params.sort?.sortOrder
  === SortOrder.ASC
    ? 'asc'
    : 'desc'
  qs.set('sortBy', sortBy)
  qs.set('sortDirection', sortDirection)

  if (params.filters.collectionIds && params.filters.collectionIds.length > 0) {
    qs.set('collectionIds', params.filters.collectionIds.join(','))
  }

  if (params.filters.currency && params.filters.currency.length > 0) {
    const currencyParam = params.filters.currency.map(currency => getCurrencyAddress(currency)).join(',')
    qs.set('currencies', currencyParam)
  }

  if (params.filters.dueWithin) {
    const dueAtBefore = new Date()
    dueAtBefore.setDate(dueAtBefore.getDate() + params.filters.dueWithin)
    qs.set('dueAtBefore', dueAtBefore.toISOString())
  }

  return qs.toString()
}

export async function getLoans(params: GetLoansParams): Promise<EntitiesPaginated<Loan<Protocol>>> {
  const queryString = serializeLoansParams(params)

  const response = await loansFetcher({
    url: `/v1/loans?${queryString}`,
  }, null as never)

  const total = parseInt(response.headers.get('x-pagination-total') || '0')

  return {
    data: convertLoans(response.data),
    total,
  }
}

function convertLoans(data: LoansApiResponse): Loan<Protocol>[] {
  return data.map(loan => {
    const currency = getCurrencyFromAddress(loan.currency)
    const protocol = getProtocolFromName(loan.protocol)

    if (currency === null) {
      throw new PanicError({
        message: `Unknown currency: ${loan.currency}`,
        details: {
          loanId: loan.loanId,
          currency: loan.currency,
        },
      })
    }

    if (protocol === null) {
      throw new PanicError({
        message: `Unknown protocol: ${loan.protocol}`,
        details: {
          loanId: loan.loanId,
          protocol: loan.protocol,
        },
      })
    }

    const status = getLoanStatus(loan.status)
    const endedDate = loan.endedAt ? new Date(loan.endedAt) : undefined

    return {
      id: `${loan.asset.contract}-${loan.asset.tokenId}-${loan.loanId}`,
      marketLoanId: loan.id,
      loanId: parseInt(loan.loanId),
      status,
      dateStarted: new Date(loan.startedAt),
      dateDue: new Date(loan.dueAt),
      secondsUntilDue: (new Date(loan.dueAt).getTime() - new Date().getTime()) / 1000 as Seconds,
      dateRepaid: status === LoanStatus.Repaid ? endedDate : undefined,
      dateLiquidated: status === LoanStatus.Liquidated ? endedDate : undefined,
      nft: {
        id: BigInt(loan.asset.tokenId),
        address: loan.asset.contract as Address,
      },
      borrower: loan.borrower as Address,
      lender: loan.lender as Address,
      loanContractName: loan.contractName,
      loanContract: loan.contract as Address,
      protocol,
      terms: {
        duration: loan.duration as Seconds,
        repayment: BigInt(loan.principal) + BigInt(loan.interest) as Wei,
        repaymentMax: BigInt(loan.repaymentMax) as Wei,
        principal: BigInt(loan.principal) as Wei,
        origination: BigInt(loan.originationFee) as Wei,
        apr: loan.apr as Percentage,
        effectiveApr: loan.eapr as Percentage,
        currency,
        isProRated: loan.prorated,
      },
    }
  })
}
