import { Address } from 'src/entities/base/Address'
import { OnChainFetcherDependencies } from '../../factories/onChain/createOnChainFetcher'

export async function lookupEns(ensName: string, dependencies: OnChainFetcherDependencies): Promise<Address | null> {
  const provider = await dependencies.getProvider()
  return await provider.resolveName(ensName) as Address | null
}
