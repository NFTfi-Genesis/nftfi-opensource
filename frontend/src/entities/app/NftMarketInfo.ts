import { Amount } from 'src/entities/base/Amount'
import { Nft } from 'src/entities/domain/Nft'

export type NftMarketInfo = {
  nft: Nft
  rarity?: number
  lastSale: {
    amount?: Amount
    currency?: string
  }
}
