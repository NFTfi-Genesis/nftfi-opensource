import { useContext } from 'react'
import { ContextUsageError } from 'src/errors/ContextUsageError'
import { ModalsContext, ModalsContextType } from './ModalsProvider'
import { Modals } from './Modals'

export function useModals<T extends Modals>(modal: T): ModalsContextType[T] {
  const context = useContext(ModalsContext)

  if (context === null) {
    throw new ContextUsageError({
      message: 'useModals must be used within a ModalsProvider',
    })
  }

  return context[modal]
}
