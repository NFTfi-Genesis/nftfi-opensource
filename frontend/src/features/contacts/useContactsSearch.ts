import { FuseResultMatch } from 'fuse.js'
import { useMemo } from 'react'
import { Contact } from 'src/entities/domain/Contact'
import { useSearch } from 'src/hooks/useSearch'

type FilteredContact = { item: Contact, matches?: readonly FuseResultMatch[] }

interface UseContactsSearchReturn {
  searchValue: string
  setSearchValue: (value: string) => void
  handleClearSearch: () => void
  filteredContacts: FilteredContact[]
}

export function useContactsSearch(
  contacts: Contact[]
): UseContactsSearchReturn {
  const flattenedContacts = useMemo(() => {
    return contacts.map(contact => {
      const flattened = { ...contact } as Contact & Record<string, string>

      contact.addresses.forEach((address, index) => {
        flattened[`addresses-${index}`] = address.value
        if (address?.ens) flattened[`ens-${index}`] = address.ens
      })

      return flattened
    })
  }, [contacts])

  const config = useMemo(
    () => ({
      keys: [
        { name: 'name', weight: 0.7 },
        ...Array.from({ length: 21 }, (_, i) => ({
          name: `addresses-${i}`,
          weight: 0.6,
        })),
        ...Array.from({ length: 21 }, (_, i) => ({
          name: `ens-${i}`,
          weight: 0.6,
        })),
        { name: 'xHandle', weight: 0.6 },
        { name: 'discordHandle', weight: 0.6 },
        { name: 'email', weight: 0.6 },
        { name: 'telegramHandle', weight: 0.6 },
        { name: 'notes', weight: 0.4 },
      ],
      includeMatches: true,
      ignoreLocation: true,
      shouldSort: true,
      useExtendedSearch: true,
    }),
    []
  )

  const { searchValue, setSearchValue, handleClearSearch, filteredItems }
    = useSearch(flattenedContacts, config)

  return {
    searchValue,
    setSearchValue,
    handleClearSearch,
    filteredContacts: filteredItems,
  }
}
