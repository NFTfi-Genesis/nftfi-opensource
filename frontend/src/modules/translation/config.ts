import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { LocaleResource as DynamicLocaleResource } from '@dynamic-labs/sdk-react-core'
import enTranslation from '../../assets/translations/en.json'

export enum Language {
  en = 'en',
}

export const LanguageDisplayNames = {
  [Language.en]: 'EN',
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: enTranslation },
  },
  fallbackLng: 'en',
  // debug: true, // Activate for console log debugging
})

export const dynamicTranslations = {
  en: enTranslation['dynamic' as keyof typeof enTranslation],
} as DynamicLocaleResource

export { i18n }
