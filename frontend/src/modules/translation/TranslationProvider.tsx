import { createContext, ReactNode, useEffect } from 'react'
import { useTranslation as useI18nTranslation } from 'react-i18next'
import { TFunction } from 'src/modules/translation/TFunction'
import { LocalStorageKeys } from 'src/modules/localStorage/config'
import { useLocalStorage } from 'src/modules/localStorage/useLocalStorage'

export const TranslationContext = createContext<{
  t: TFunction
}>({
  t: (() => '') as TFunction,
})

export const TranslationProvider = ({ children }: { children: ReactNode }) => {
  const { i18n, t } = useI18nTranslation()

  const [language] = useLocalStorage(LocalStorageKeys.Language)
  useEffect(() => {
    i18n.changeLanguage(language)
  }, [i18n, language])

  return <TranslationContext.Provider value={{ t: t as TFunction }}>{children}</TranslationContext.Provider>
}
