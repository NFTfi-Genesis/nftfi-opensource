import { useEffect, useState } from 'react'
import { useSdk } from 'src/modules/sdk/useSdk'
import { Address } from 'src/entities/base/Address'

type EnsRecord = {
  address: Address
  ens: string | null
}

export function useEnsReverseLookupMany(addresses: Address[]) {
  const { sdk } = useSdk()

  const [ensRecords, setEnsRecords] = useState<EnsRecord[]>([])

  useEffect(() => {
    if (!addresses?.length || !sdk) {
      setEnsRecords(addresses.map(address => ({ address, ens: null })))
      return
    }

    const lookupEnsNames = async () => {
      const lookupPromises = addresses.map(async address => {
        try {
          const { data } = await sdk.utils.wallet.reverseEnsLookup({
            address,
          })
          return {
            address,
            ens: data?.ens,
          }
        } catch (error) {
          console.error(`Error looking up ENS name for ${address}:`, error)
          return {
            address,
            ens: null,
          }
        }
      })

      const results = await Promise.all(lookupPromises)
      setEnsRecords(results)
    }

    lookupEnsNames()
  }, [sdk, addresses])

  return ensRecords
}
