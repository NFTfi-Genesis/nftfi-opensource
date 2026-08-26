import { useState, useMemo, useCallback } from 'react'
import Fuse, { FuseResultMatch, IFuseOptions } from 'fuse.js'
import { useDebounce } from './useDebounce'

type FilteredItem<T> = { item: T, matches?: readonly FuseResultMatch[] }

interface UseSearchReturn<T> {
  searchValue: string
  setSearchValue: (value: string) => void
  handleClearSearch: () => void
  filteredItems: FilteredItem<T>[]
}

export function useSearch<T>(items: T[], config: IFuseOptions<T>): UseSearchReturn<T> {
  const [searchValue, setSearchValue] = useState('')

  // Debounce the setSearchValue function to prevent input lag
  const debouncedSetSearchValue = useDebounce(setSearchValue, 50)

  const handleClearSearch = useCallback(() => {
    setSearchValue('')
  }, [])

  const fuse = useMemo(
    () =>
      new Fuse(items, config),
    [items, config]
  )

  const filteredItems = useMemo(() => {
    if (!searchValue.trim()) {
      return items.map(item => ({ item, matches: undefined }))
    }

    return fuse.search(`'${searchValue}`)
  }, [fuse, searchValue, items])

  return {
    searchValue,
    setSearchValue: debouncedSetSearchValue,
    handleClearSearch,
    filteredItems,
  }
}
