import { Loan } from 'src/entities/domain/Loan'
import { Protocol } from 'src/entities/domain/Protocol'
import { LoanExtended } from 'src/entities/app/LoanExtended'
import { NftExtended } from 'src/entities/app/NftExtended'
import { NftInfo } from 'src/entities/app/NftInfo'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { LoanMarketInfo } from 'src/entities/app/LoanMarketInfo'
import { EntitiesPaginated } from 'src/entities/utils/EntitiesPaginated'
import { PanicError } from 'src/errors/PanicError'
import { enrichNftsWithInfo } from '../nft/enrichNftsWithInfo'
import { getLoans, GetLoansParams } from './getLoans'

export async function getLoansWithNftInfo(params: GetLoansParams): Promise<
  EntitiesPaginated<LoanExtended<NftExtended<NftInfo | CollectionExtended<CollectionInfo>> | LoanMarketInfo> & Loan<Protocol>>
> {
  const loans = await getLoans(params)
  const nftInfos = await enrichNftsWithInfo(loans.data.map(loan => loan.nft))

  return {
    data: loans.data.map(loan => {
      const nftInfo = nftInfos.find(nft => nft.address === loan.nft.address && nft.id === loan.nft.id)
      if (!nftInfo) {
        throw new PanicError({
          message: 'NFT not found in nftfi api',
          details: { loan, nftInfos },
        })
      }
      return {
        ...loan,
        nft: nftInfo,
        ltvActual: null,
        ltvChange: null,
        floorActualEth: null,
      }
    }),
    total: loans.total,
  }
}
