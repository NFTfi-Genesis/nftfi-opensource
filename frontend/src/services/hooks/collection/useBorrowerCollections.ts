import { Address } from 'src/entities/base/Address'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { Protocol } from 'src/entities/domain/Protocol'
import { ProtocolApiKeys } from 'src/utils/protocols'
import { DataKeys } from 'src/services/keys/keys'
import { getBorrowerCollections } from 'src/services/fetchers/collection/getBorrowerCollections'
import { useFetcher } from '../base/useFetcher'

type UseBorrowerCollectionsParams = {
  borrower: Address
  protocols?: Protocol[]
}

export function useBorrowerCollections(params: UseBorrowerCollectionsParams) {
  const { borrower, protocols } = params

  return useFetcher<CollectionExtended<CollectionInfo>[]>(
    DataKeys.borrowerCollections(borrower, protocols?.map(p => ProtocolApiKeys[p])),
    async () => {
      const result = await getBorrowerCollections({ borrower, protocols })
      return result.data
    }
  )
}
