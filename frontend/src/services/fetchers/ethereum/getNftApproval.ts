import { Address } from 'src/entities/base/Address'
import { PanicError } from 'src/errors/PanicError'
import { config } from 'src/config/config'
import { OnChainFetcherDependencies } from '../../factories/onChain/createOnChainFetcher'
import { getApproval as getErc721Approval } from './getErc721Approval'
import { getPunkApproval } from './getPunkApproval'

const cryptopunksAddress = config.ethereum.contracts.nftfi.collection.cryptopunks.address

export async function getNftApproval(
  params: {
    contractAddress: Address
    owner: Address
    operator: Address
    tokenId?: bigint
  },
  dependencies: OnChainFetcherDependencies
): Promise<boolean> {
  const { contractAddress, owner, operator, tokenId } = params
  const contractAddressLower = contractAddress.toLowerCase()

  if (contractAddressLower === cryptopunksAddress) {
    if (!tokenId) {
      throw new PanicError({ message: 'tokenId is required for CryptoPunks approval check' })
    }
    return getPunkApproval(tokenId, operator, dependencies)
  } else {
    return getErc721Approval(contractAddress, owner, operator, dependencies)
  }
}
