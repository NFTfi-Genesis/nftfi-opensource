// TODO: Lot's of files import from src/features, this should not happen in any other folder than pages
import { MarketFilters } from 'src/features/market/tables/useMarketFilters'
import { Percentage } from 'src/entities/base/Percentage'
import { Amount } from 'src/entities/base/Amount'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { EntitiesPaginated } from 'src/entities/utils/EntitiesPaginated'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { PaginationParams } from 'src/entities/app/PaginationParams'
import { createNftfiApiFetcher } from '../../factories/nftfiApi/createNftfiApiFetcher'
import { AuthMode } from '../../types/AuthMode'
import { getPaginationTotal, serializeAnalyticsParams } from '../overview/utils'

export type GetActiveCollectionsParams = {
  filters: MarketFilters
  pagination?: PaginationParams
}

type ApiCollectionStats = {
  collectionId: number
  collectionName: string
  collectionImageUrl: string | null
  totalUsdValue: Amount | null
  avgUsdValue: Amount | null
  avgApr: Percentage | null
  loanCount: number | null
  percentageOfTotal: Percentage | null
}

const collectionsFetcher = createNftfiApiFetcher<ApiCollectionStats[], AuthMode.None, true>({
  authMode: AuthMode.None,
  includeHeaders: true,
})

// TODO: remove this and use CollectionExtended<CollectionInfo, CollectionStats> directly
// as soon as assets service supports filtering collections by loan filters
type CompatibleCollection = Omit<CollectionExtended<CollectionInfo>, 'key' | 'address' | 'start' | 'end'> & {
  totalValue: Amount
  collectionsTotalValue: Amount
}

export async function getActiveCollections(params: GetActiveCollectionsParams): Promise<EntitiesPaginated<CompatibleCollection>> {
  const qs = serializeAnalyticsParams({
    filters: params.filters,
    pagination: params.pagination,
  })
  const response = await collectionsFetcher({ url: `v1/analytics/stats-by-collection?${qs}` }, null as never)
  return convertCollections(response)
}

function convertCollections(
  response: { data: ApiCollectionStats[], headers: Headers }
): EntitiesPaginated<CompatibleCollection> {
  const collectionsTotalValue = response.data.reduce(
    (sum, col) => (sum + (col.totalUsdValue ?? 0)) as Amount,
    0 as Amount
  )
  return {
    total: getPaginationTotal(response.headers, response.data.length),
    data: response.data
      .map(collection => ({
        id: collection.collectionId.toString(),
        info: {
          name: collection.collectionName,
          imageUri: getCollectionImage(collection),
        },
        totalValue: (collection.totalUsdValue ?? 0) as Amount,
        collectionsTotalValue,
      })),
  }
}

// TODO: these are workarounds until backend support arcade & gondi vault images
function getCollectionImage(collection: ApiCollectionStats) {
  if (
    collection.collectionName === 'Arcade.xyz Vault Keys'
    || collection.collectionName === 'Arcade Vault V2'
    || collection.collectionName === 'Arcade Vault'
  ) {
    return ARCADE_VAULTS_IMAGE
  }
  if (collection.collectionName === 'Gondi Vault') {
    return GONDI_VAULT_IMAGE
  }
  return collection.collectionImageUrl || ''
}

// TODO: this link must be replaced to not use reservoir
const ARCADE_VAULTS_IMAGE
  = 'https://img.reservoir.tools/images/v2/mainnet/7%2FrdF%2Fe%2F0iXY8HduhRCoIehkmFeXPeOQQFbbmIPfjCb1PRnThuHTObTifwTJtcjErom4pver%2F5OS4pUS8IZ%2BAjy3R7DriKxBaVomcIEAgS3oEEMAZZiLJ%2FOQV1E66GMc7kpShA1cXMALt9XP64XiEg%3D%3D.png?width=250'

const GONDI_VAULT_IMAGE = (() => {
  const hostname = window.location.hostname.split('.')[0]
  if (hostname === 'localhost') {
    return '/assets/gondi-vault.png'
  }
  return `https://${hostname}.nftfi.com/ns/assets/gondi-vault.png`
})()
