import { Address } from 'src/entities/base/Address'
import { contracts } from 'src/config/contracts'
import { PanicError } from 'src/errors/PanicError'
import { OnChainMutatorDependencies } from '../../factories/onChain/createOnChainMutator'
import { setErc721Approval, SetErc721ApprovalParams } from './setErc721Approval'
import { setPunkApproval, SetPunkApprovalParams } from './setPunkApproval'

const cryptopunksAddress = contracts.nftfi.collection.cryptopunks.address.toLowerCase()
export type SetNftApprovalParams = (SetPunkApprovalParams & { contractAddress: Address }) | SetErc721ApprovalParams

export function setNftApproval(
  params: SetNftApprovalParams,
  dependencies: OnChainMutatorDependencies
) {
  const { contractAddress } = params

  if (contractAddress === cryptopunksAddress) {
    if ('tokenId' in params && 'minSalePriceInWei' in params) {
      const { tokenId, operator, minSalePriceInWei } = params
      if (!tokenId) {
        throw new PanicError({ message: 'tokenId is required for CryptoPunks approval' })
      }
      if (minSalePriceInWei === undefined) {
        throw new PanicError({ message: 'minSalePriceInWei is required for CryptoPunks approval' })
      }
      return setPunkApproval({ tokenId, operator, minSalePriceInWei }, dependencies)
    }
    throw new PanicError({ message: 'tokenId and minSalePriceInWei are required for CryptoPunks approval' })
  } else {
    if ('approved' in params) {
      const { contractAddress, operator, approved } = params
      return setErc721Approval({ contractAddress, operator, approved }, dependencies)
    }
    throw new PanicError({ message: 'approved is required for ERC721 approval' })
  }
}
