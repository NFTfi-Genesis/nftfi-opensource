import { Percentage } from 'src/entities/base/Percentage'
import { Amount } from 'src/entities/base/Amount'

export type LoanMarketInfo = {
  ltvActual: Percentage | null
  ltvChange: Percentage | null
  floorActualEth: Amount | null
}
