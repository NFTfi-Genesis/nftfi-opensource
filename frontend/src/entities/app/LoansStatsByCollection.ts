// import { Collection } from 'src/entities/domain/Collection'
import { Amount } from 'src/entities/base/Amount'
import { Percentage } from 'src/entities/base/Percentage'

// TODO: included only for compatibility with the TB api
// eventually remove and use CollectionStats
export type LoansStatsByCollection = {
  name: string
  imageUrl: string
  loanCount: number
  totalUsdValue: Amount
  avgUsdValue: Amount
  avgApr: Percentage
  share: Percentage
}
