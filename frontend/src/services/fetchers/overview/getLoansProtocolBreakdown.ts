import { MarketFilters } from 'src/features/market/tables/useMarketFilters'
import { Amount } from 'src/entities/base/Amount'
import { LoansProtocolBreakdown } from 'src/entities/app/LoansProtocolBreakdown'
import { Protocol } from 'src/entities/domain/Protocol'
import { getProtocolFromName } from 'src/utils/protocols'
import { createNftfiApiFetcher } from '../../factories/nftfiApi/createNftfiApiFetcher'
import { AuthMode } from '../../types/AuthMode'
import { serializeAnalyticsParams } from './utils'

export type GetLoansProtocolBreakdownParams = {
  filters: MarketFilters
}

export type ApiResponseLoansProtocolBreakdown = {
  protocol: string
  total: number | null
}

const loansProtocolBreakdownFetcher = createNftfiApiFetcher<ApiResponseLoansProtocolBreakdown[]>({
  authMode: AuthMode.None,
})

export const getLoansProtocolBreakdown = async (params: GetLoansProtocolBreakdownParams) => {
  const qs = serializeAnalyticsParams({ filters: params.filters })

  const response = await loansProtocolBreakdownFetcher({ url: `v1/analytics/protocol-breakdown?${qs}` }, null as never)
  return convertLoansProtocolBreakdown(response)
}

function convertLoansProtocolBreakdown(data: ApiResponseLoansProtocolBreakdown[]): LoansProtocolBreakdown | null {
  if (!data.length) {
    return null
  }

  const result: LoansProtocolBreakdown = {
    arcade: 0 as Amount,
    blur: 0 as Amount,
    gondi: 0 as Amount,
    metastreet: 0 as Amount,
    nftfi: 0 as Amount,
    x2y2: 0 as Amount,
    zharta: 0 as Amount,
    total: data.reduce((total, item) => (total + (item.total ?? 0)) as Amount, 0 as Amount),
  }

  data.forEach(item => {
    const protocol = getProtocolFromName(item.protocol)
    if (protocol === Protocol.Arcade) result.arcade = (item.total ?? 0) as Amount
    if (protocol === Protocol.Blur) result.blur = (item.total ?? 0) as Amount
    if (protocol === Protocol.Gondi) result.gondi = (item.total ?? 0) as Amount
    if (protocol === Protocol.Metastreet) result.metastreet = (item.total ?? 0) as Amount
    if (protocol === Protocol.Nftfi) result.nftfi = (item.total ?? 0) as Amount
    if (protocol === Protocol.X2y2) result.x2y2 = (item.total ?? 0) as Amount
    if (protocol === Protocol.Zharta) result.zharta = (item.total ?? 0) as Amount
  })

  return result
}
