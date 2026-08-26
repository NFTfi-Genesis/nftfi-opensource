import { Amount } from 'src/entities/base/Amount'
import { Currency } from 'src/entities/domain/Currency'

export type CollectionMarketInfo = {
  // Made this nullable because there are no guarantees that the floor price will be available for every collection
  floor: {
    amount: Amount
    currency: Currency
  } | null
  // TODO: make this non-nullable when BE supports this
  topOffer: {
    amount: Amount
    currency: Currency
  } | null
}
