import { useCallback, useState } from 'react'

export type CreateModalResult<T> = {
  data: T | null
  isOpen: boolean
  open: (props: T) => void
  close: () => void
}
export function useCreateModal<T>(): CreateModalResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback((props: T) => {
    setIsOpen(true)
    setData(props)
  }, [])

  const close = useCallback(() => {
    setData(null)
    setIsOpen(false)
  }, [])

  return {
    data,
    isOpen,
    open,
    close,
  }
}
