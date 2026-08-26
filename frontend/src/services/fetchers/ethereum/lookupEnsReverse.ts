import { Address } from 'src/entities/base/Address'
import { OnChainFetcherDependencies } from '../../factories/onChain/createOnChainFetcher'

export async function lookupEnsReverse(address: Address, dependencies: OnChainFetcherDependencies): Promise<string | null> {
  const provider = await dependencies.getProvider()
  return await provider.lookupAddress(address)
}
