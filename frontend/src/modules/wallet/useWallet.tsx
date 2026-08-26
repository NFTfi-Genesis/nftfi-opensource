import { useContext } from 'react'
import { ContextUsageError } from 'src/errors/ContextUsageError'
import { WalletContext } from './WalletProvider'

export function useWallet() {
  const walletContext = useContext(WalletContext)
  if (!walletContext) {
    throw new ContextUsageError({ message: 'useWallet must be used within a WalletProvider' })
  }

  return walletContext
}
