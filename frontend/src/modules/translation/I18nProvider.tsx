import { ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import { i18n } from 'src/modules/translation/config'

/*
To adapt dynamic localization:
https://docs.dynamic.xyz/design-customizations/customizing-copy-translations#adapt-copy-with-translations
*/

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
