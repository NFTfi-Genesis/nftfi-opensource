import { ReactNode } from 'react'
import { DynamicContextProvider, WalletOption } from '@dynamic-labs/sdk-react-core'
import { useTheme } from '@mui/material'
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum'
import { config } from 'src/config/config'
import { dynamicTranslations } from 'src/modules/translation/config'

export const WalletKitProvider = ({ children }: { children: ReactNode }) => {
  const theme = useTheme()

  return (
    <DynamicContextProvider
      theme={theme.palette.mode}
      settings={{
        environmentId: config.dynamicEnvironmentId,
        walletConnectors: [EthereumWalletConnectors],
        walletsFilter: (walletOptions: WalletOption[]) => {
          const allowedWallets = ['metamask', 'rabby']
          return walletOptions.filter(wallet =>
            allowedWallets.includes(wallet.key)
          )
        },
        cssOverrides: getCssOverrides({
          borderColor: theme.palette.text.primary,
        }),
        initialAuthenticationMode: 'connect-only',
      }}
      locale={dynamicTranslations}
    >
      {children}
    </DynamicContextProvider>
  )
}

type GetCssOverridesParams = {
  borderColor: string
}

function getCssOverrides({ borderColor }: GetCssOverridesParams) {
  return `
    .connect-button {
      box-shadow: none;
      border: 1px solid ${borderColor}!important;
      border-radius: var(--dynamic-border-radius);
      height: 40px;
      background: none!important;
      .typography {
        font-size: 12px !important;
        font-weight: 400 !important;
      }
    }
    .dynamic-widget-inline-controls {
      background: none!important;
      border: 1px solid ${borderColor};
      border-radius: var(--dynamic-border-radius);
    }
    .dynamic-widget-inline-controls__account-control {
      background: none!important;
    }
    .dynamic-user-profile-layout {
      height: unset !important;
    }
    .user-data-fields__fields-column {
      max-height: 100%;
    }
    .dynamic-widget-inline-controls__network-picker-main {
      display: none;
    }
    .dynamic-footer {
      display: none;
    }
    :host-context(#wallet-widget.minimised) {
      p {
        display: none!important;
      }
      button {
        width: 60px !important;
      }
    }
  `
}
