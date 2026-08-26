import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'

import './global.css'
import { ErrorBoundary } from 'src/components/ErrorBoundary/ErrorBoundary'
import { ThemeProvider } from 'src/modules/theme/ThemeProvider'
import { I18nProvider } from 'src/modules/translation/I18nProvider'
import { WalletKitProvider } from 'src/modules/wallet/WalletKitProvider'
import { WalletProvider } from 'src/modules/wallet/WalletProvider'
import { SanctionedWalletGuard } from 'src/modules/wallet/SanctionedWalletGuard'
import { NotificationsProvider } from 'src/modules/notifications/NotificationsProvider'
import { SdkProvider } from 'src/modules/sdk/SdkProvider'
import { initTelemetry } from 'src/modules/telemetry/initTelemetry'
import { ThemeMode } from 'src/modules/theme/types'
import { initializeMsw } from 'src/services/mocks/initializeMsw'
import { TranslationProvider } from 'src/modules/translation/TranslationProvider'
import { AuthProvider } from 'src/modules/auth/AuthProvider'
import { ContactsDrawerProvider } from 'src/features/contacts/ContactsDrawerContext'
import { DrawersProvider } from 'src/modules/drawers/DrawersProvider'
import { ModalsProvider } from 'src/modules/modals/ModalsProvider'
import { installGlobalErrorHandlers } from 'src/utils/errors'
import { App } from './App'

initTelemetry()
initializeMsw()
installGlobalErrorHandlers()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider initialThemeMode={ThemeMode.dark}>
        <I18nProvider>
          <TranslationProvider>
            <WalletKitProvider>
              <WalletProvider>
                <NotificationsProvider>
                  <SanctionedWalletGuard />
                  <HelmetProvider>
                    <BrowserRouter>
                      <SdkProvider>
                        <DrawersProvider>
                          <ContactsDrawerProvider>
                            <AuthProvider>
                              <ModalsProvider>
                                <App />
                              </ModalsProvider>
                            </AuthProvider>
                          </ContactsDrawerProvider>
                        </DrawersProvider>
                      </SdkProvider>
                    </BrowserRouter>
                  </HelmetProvider>
                </NotificationsProvider>
              </WalletProvider>
            </WalletKitProvider>
          </TranslationProvider>
        </I18nProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>
)
