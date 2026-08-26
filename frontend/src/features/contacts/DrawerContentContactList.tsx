import { alpha, Stack } from '@mui/material'
import { useCallback, useState } from 'react'
import { Contact, ContactsSortType, ContactsSortDirection } from 'src/entities/domain/Contact'
import { ContactItem } from './List/ContactItem'
import { AddContactButton } from './Common/AddContactButton'
import { Search } from './List/Search'
import { ContactForm } from './Form/ContactForm'
import { useContactsSearch } from './useContactsSearch'
import { SortMenu } from './List/SortMenu'

interface DrawerContentContactListProps {
  contacts: Contact[]
  onAddContact: () => void
  refresh: () => void
  onSortAlphabetically: () => void
  onSortByDateAdded: () => void
  sortType: ContactsSortType
  sortDirection: ContactsSortDirection
}

export function DrawerContentContactList({
  contacts,
  onAddContact,
  refresh,
  onSortAlphabetically,
  onSortByDateAdded,
  sortType,
  sortDirection,
}: DrawerContentContactListProps) {
  const [expandedContactId, setExpandedContactId] = useState<string | null>(
    null
  )

  const [isEditing, setIsEditing] = useState<string | null>(null)

  const handleExpand = useCallback((contactId: string) => {
    setExpandedContactId(prev => (prev === contactId
      ? null
      : contactId))
  }, [])

  const { setSearchValue, handleClearSearch, filteredContacts }
    = useContactsSearch(contacts)

  const handleClearSearchAndCollapse = useCallback(() => {
    handleClearSearch()
    setExpandedContactId(null)
  }, [handleClearSearch])

  return (
    <Stack gap={3}>
      <Stack
        direction='row'
        sx={theme => ({
          gap: 4,
          height: 70,
          backgroundColor: alpha(theme.palette.common.white, 0.03),
          px: 2.5,
          py: 1,
        })}
      >
        <Search
          onChange={setSearchValue}
          onClear={handleClearSearchAndCollapse}
        />
        <SortMenu
          onSortAlphabetically={onSortAlphabetically}
          onSortByDateAdded={onSortByDateAdded}
          sortType={sortType}
          sortDirection={sortDirection}
        />
      </Stack>
      <Stack px={2.5} pb={2.5} gap={3}>
        <AddContactButton onAddContact={onAddContact} />
        {filteredContacts.map(({ item: contact, matches }, index) => {
          return isEditing !== contact.contactId
            ? (
              <ContactItem
                index={index}
                key={contact.contactId}
                item={contact}
                matches={matches}
                fullyExpanded={expandedContactId === contact.contactId}
                onExpand={() => handleExpand(contact.contactId)}
                refresh={refresh}
                onEdit={() => setIsEditing(contact.contactId)}
              />
            )
            : (
              <ContactForm
                key={contact.contactId}
                onCancel={() => {
                  setIsEditing(null)
                  refresh()
                }}
                defaultValues={contact}
              />
            )
        })}
      </Stack>
    </Stack>
  )
}
