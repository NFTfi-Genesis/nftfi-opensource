import { useEffect, useRef, useState } from 'react'

export function usePromise<T>(
  factory: (() => Promise<T>) | null,
  deps: React.DependencyList = []
) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [isPending, setIsPending] = useState(false)

  const isActive = useRef(true)

  useEffect(() => {
    isActive.current = true

    if (!factory) {
      setIsPending(false)
      setError(null)
      setData(null)
      return () => {
        isActive.current = false
      }
    }

    const run = async () => {
      setIsPending(true)
      setError(null)

      try {
        const value = await factory()
        if (!isActive.current) return
        setData(value)
      } catch (err) {
        if (!isActive.current) return
        setError(err)
      } finally {
        if (isActive.current) {
          setIsPending(false)
        }
      }
    }

    void run()

    return () => {
      isActive.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factory, ...deps])

  return { data, error, isPending }
}
