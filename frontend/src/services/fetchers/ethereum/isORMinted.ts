import { Address } from 'src/entities/base/Address'
import { config } from 'src/config/config'
import { OnChainFetcherDependencies } from '../../factories/onChain/createOnChainFetcher'
import { getNftfiLoanContractAndORId } from './getNftfiLoanContractAndORId'
import { getOwnerOfErc721 } from './getOwnerOfErc721'

const obligationReceipt = config.ethereum.contracts.nftfi.v3.obligationReceipt.address

export async function isORMinted(
  loanId: number,
  walletAddress: Address | null,
  dependencies: OnChainFetcherDependencies
): Promise<boolean> {
  if (!walletAddress) {
    return false
  }

  const { ORId } = await getNftfiLoanContractAndORId(loanId, dependencies)
  if (ORId === 0n) {
    return false
  }

  const owner = await getOwnerOfErc721({ id: ORId, address: obligationReceipt }, dependencies)

  return owner === walletAddress
}
