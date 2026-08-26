import { Loan } from 'src/entities/domain/Loan'
import { Nft } from 'src/entities/domain/Nft'
import { Collection } from 'src/entities/domain/Collection'
import { ExtendWithProp, ExtendWithProps } from 'src/typesUtils'
import { LoanMarketInfo } from 'src/entities/app/LoanMarketInfo'

type Extensions = Nft | Collection | LoanMarketInfo

export type LoanExtended<
  Exts extends Extensions = Nft
> = Loan
  & ExtendWithProp<Exts, Nft, 'nft'>
  & ExtendWithProp<Exts, Collection, 'collection'>
  & ExtendWithProps<Exts, LoanMarketInfo>
