/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { createContext, ReactNode, useEffect, useState } from 'react'
import NFTfi from '@nftfi/js'
import { useWallet } from 'src/modules/wallet/useWallet'
import { notify, NotificationType } from 'src/modules/notifications/notify'
import { Sdk } from 'src/modules/sdk/types'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { config } from 'src/config/config'
import { getLocalStorageValue, updateLocalStorage } from 'src/modules/localStorage/localStorage'

export const SdkContext = createContext<Sdk>(null)

export const SdkProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation()
  const { signer: jsonRpcSigner, walletAddress } = useWallet()
  const [sdk, setSdk] = useState<Sdk | null>(null)

  useEffect(() => {
    const initSdk = async () => {
      if (jsonRpcSigner && walletAddress) {
        try {
          const nftfi = await NFTfi.init({
            config: {
              api: {
                key: config.apiServices.nftfiSdkApiKey,
                baseURI: config.apiServices.nftfiSdkApiUrl,
              },
              auth: {
                token: { key: 'jwtToken' },
                refreshToken: { key: 'refreshToken' },
                errorToken: { key: 'errorToken' },
              },
            },
            ethereum: {
              account: { address: walletAddress },
              ethers: { signer: { jsonRpc: jsonRpcSigner } },
            },
            dependencies: {
              storage: {
                set: (key: any, value: string) => {
                  updateLocalStorage(`${key}-${walletAddress}`, value)
                },
                get: (key: any) => {
                  return getLocalStorageValue(`${key}-${walletAddress}`)
                },
              },
            },
          })
          setSdk(nftfi)
        } catch (error) {
          console.error('Error initializing NFTfi SDK:', error)
          notify({
            message: t('error-messages.sdk-init'),
            variant: NotificationType.Error,
          })
        }
      } else setSdk(null)
    }

    initSdk()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jsonRpcSigner, walletAddress])

  return <SdkContext.Provider value={{ sdk }}>{children}</SdkContext.Provider>
}
