import { useEffect, useState } from 'react'
import { useSdk } from 'src/modules/sdk/useSdk'

export function useEnsLookup(ensName?: string) {
  const { sdk } = useSdk()
  const [address, setAddress] = useState<string | null>(null)

  useEffect(() => {
    if (!ensName || !sdk) {
      setAddress(null)
      return
    }

    const lookupAddress = async () => {
      try {
        const { data } = await sdk.utils.wallet.ensLookup({ ensName })
        setAddress(data?.address)
      } catch (error) {
        console.error('Error looking up ENS address:', error)
      }
    }

    lookupAddress()
  }, [sdk, ensName])

  return address
}
