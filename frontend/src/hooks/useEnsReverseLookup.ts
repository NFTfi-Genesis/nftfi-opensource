import { useEffect, useState } from 'react'
import { useSdk } from 'src/modules/sdk/useSdk'
import { Address } from 'src/entities/base/Address'

export function useEnsReverseLookup(address: Address | null) {
  const { sdk } = useSdk()
  const [ens, setEns] = useState<string | null>(null)

  useEffect(() => {
    if (!address || !sdk) {
      setEns(null)
      return
    }

    const lookupEns = async () => {
      try {
        const { data } = await sdk.utils.wallet.reverseEnsLookup({ address })
        setEns(data?.ens)
      } catch (error) {
        console.error('Error looking up ENS name:', error)
      }
    }

    lookupEns()
  }, [sdk, address])

  return ens
}
