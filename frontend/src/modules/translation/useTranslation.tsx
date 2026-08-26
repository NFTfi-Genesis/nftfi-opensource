import { useContext } from 'react'
import { ContextUsageError } from 'src/errors/ContextUsageError'
import { TranslationContext } from './TranslationProvider'

export const useTranslation = () => {
  const translationContext = useContext(TranslationContext)
  if (!translationContext) {
    throw new ContextUsageError({ message: 'useTranslation must be used within a TranslationProvider' })
  }
  const { t } = translationContext
  return {
    t,
  }
}
