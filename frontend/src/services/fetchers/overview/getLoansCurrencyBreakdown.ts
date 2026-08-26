import { MarketFilters } from 'src/features/market/tables/useMarketFilters'
import { Amount } from 'src/entities/base/Amount'
import { Address } from 'src/entities/base/Address'
import { LoansCurrencyBreakdown } from 'src/entities/app/LoansCurrencyBreakdown'
import { Currency } from 'src/entities/domain/Currency'
import { getCurrencyFromAddress } from 'src/utils/currencies'
import { createNftfiApiFetcher } from '../../factories/nftfiApi/createNftfiApiFetcher'
import { AuthMode } from '../../types/AuthMode'
import { serializeAnalyticsParams } from './utils'

export type GetLoansCurrencyBreakdownParams = {
  filters: MarketFilters
}

export type ApiResponseLoansCurrencyBreakdown = {
  currency: string
  totalUsd: number | null
  totalNative: number | null
}

const loansCurrencyBreakdownFetcher = createNftfiApiFetcher<ApiResponseLoansCurrencyBreakdown[]>({
  authMode: AuthMode.None,
})

export async function getLoansCurrencyBreakdown(params: GetLoansCurrencyBreakdownParams) {
  const qs = serializeAnalyticsParams({ filters: params.filters })

  const response = await loansCurrencyBreakdownFetcher({ url: `v1/analytics/currency-breakdown?${qs}` }, null as never)

  return convertLoansCurrencyBreakdown(response)
}

function convertLoansCurrencyBreakdown(data: ApiResponseLoansCurrencyBreakdown[]): LoansCurrencyBreakdown | null {
  if (!data.length) {
    return null
  }

  const result: LoansCurrencyBreakdown = {
    total: data.reduce((total, item) => (total + (item.totalUsd ?? 0)) as Amount, 0 as Amount),
    usdc: 0 as Amount,
    usdcNative: 0 as Amount,
    dai: 0 as Amount,
    daiNative: 0 as Amount,
    weth: 0 as Amount,
    wethNative: 0 as Amount,
    wsteth: 0 as Amount,
    wstethNative: 0 as Amount,
  }

  data.forEach(item => {
    const currency = getCurrencyFromAddress(item.currency as Address)
    if (currency === Currency.USDC) {
      result.usdc = (item.totalUsd ?? 0) as Amount
      result.usdcNative = (item.totalNative ?? 0) as Amount
    } else if (currency === Currency.DAI) {
      result.dai = (item.totalUsd ?? 0) as Amount
      result.daiNative = (item.totalNative ?? 0) as Amount
    } else if (currency === Currency.WETH) {
      result.weth = (item.totalUsd ?? 0) as Amount
      result.wethNative = (item.totalNative ?? 0) as Amount
    } else if (currency === Currency.WSTETH) {
      result.wsteth = (item.totalUsd ?? 0) as Amount
      result.wstethNative = (item.totalNative ?? 0) as Amount
    }
  })

  return result
}
