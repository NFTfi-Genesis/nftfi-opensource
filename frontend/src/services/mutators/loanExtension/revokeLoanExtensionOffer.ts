import { createNftfiApiMutator, NftfiApiMutatorDependencies } from 'src/services/factories/nftfiApi/createNftfiApiMutator'
import { AuthMode } from 'src/services/types/AuthMode'
import { HttpMethod } from 'src/services/types/HttpMethod'

type RevokeLoanExtensionOfferResponse = unknown

const revokeMutator = createNftfiApiMutator<RevokeLoanExtensionOfferResponse, AuthMode.Required>({
  authMode: AuthMode.Required,
  method: HttpMethod.DELETE,
})

export type RevokeLoanExtensionOfferParams = {
  offerId: number
}

export async function revokeLoanExtensionOffer(
  params: RevokeLoanExtensionOfferParams,
  dependencies: NftfiApiMutatorDependencies<AuthMode.Required>,
): Promise<RevokeLoanExtensionOfferResponse> {
  return revokeMutator({ url: `/v1/renegotiations/${params.offerId}` }, dependencies)
}
