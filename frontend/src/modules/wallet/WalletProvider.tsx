import { createContext, ReactNode, useState, useEffect, useCallback, useRef } from 'react'
import {
  useDynamicContext,
} from '@dynamic-labs/sdk-react-core'
import { getSigner as getDynamicSigner } from '@dynamic-labs/ethers-v6'
import { JsonRpcSigner, JsonRpcProvider } from 'ethers'
import { Address } from 'src/entities/base/Address'
import { config } from 'src/config/config'
import { telemetryGlobalContext } from 'src/modules/telemetry/telemetryGlobalContext'

// This context provides essential wallet information
// The API is wallet-kit agnostic, any wallet-kit provider can be a drop-in replacement
export const WalletContext = createContext<{
  walletAddress: Address | null
  currentWallet: string
  isWalletAvailable: boolean
  signer: JsonRpcSigner | null
  getSigner: () => Promise<JsonRpcSigner | null>
  getProvider: () => Promise<JsonRpcProvider>
}>({
  walletAddress: null,
  currentWallet: '',
  isWalletAvailable: false,
  signer: null,
  getSigner: async () => null,
  getProvider: async () => new JsonRpcProvider(config.ethereum.fallbackRpcUrl),
})

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { primaryWallet } = useDynamicContext()

  const primaryWalletRef = useRef<ReturnType<typeof useDynamicContext>['primaryWallet']>(null)

  let walletAddress = (primaryWallet?.address?.toLowerCase() as Address) ?? null
  if (config.test.impersonatedWalletsMap) {
    walletAddress = config.test.impersonatedWalletsMap[walletAddress] ?? walletAddress
  }
  if (config.test.impersonatedWallet) {
    walletAddress = config.test.impersonatedWallet
  }
  const currentWallet = primaryWallet?.key ?? ''
  const isWalletAvailable = Boolean(walletAddress)

  const [signer, setSigner] = useState<Awaited<ReturnType<typeof getSigner>> | null>(null)

  useEffect(() => {
    primaryWalletRef.current = primaryWallet
  }, [primaryWallet])

  const getSigner = useCallback(async () => {
    if (!primaryWalletRef.current) {
      return null
    }
    return await getDynamicSigner(primaryWalletRef.current)
  }, [primaryWalletRef])

  const getProvider = useCallback(async () => {
    let provider = new JsonRpcProvider(config.ethereum.fallbackRpcUrl)
    if (primaryWalletRef.current) {
      const signer = await getDynamicSigner(primaryWalletRef.current)
      if (signer) {
        provider = signer.provider as JsonRpcProvider
      }
    }
    return provider
  }, [primaryWalletRef])

  useEffect(() => {
    telemetryGlobalContext.walletAddress = walletAddress
  }, [walletAddress])
  useEffect(() => {
    telemetryGlobalContext.walletUsed = currentWallet
  }, [currentWallet])

  // TOOD: legacy effect, remove it when sdk provider is removed
  useEffect(() => {
    const resolveSigner = async () => {
      if (!primaryWallet) {
        setSigner(null)
        return
      }
      try {
        const resolvedSigner = await getDynamicSigner(primaryWallet)
        setSigner(resolvedSigner)
      } catch (error) {
        console.error('Error getting signer:', error)
        setSigner(null)
      }
    }

    resolveSigner()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryWallet?.address])

  return (
    <WalletContext.Provider value={{
      walletAddress,
      currentWallet,
      isWalletAvailable,
      signer,
      getSigner,
      getProvider,
    }}>
      {children}
    </WalletContext.Provider>
  )
}
