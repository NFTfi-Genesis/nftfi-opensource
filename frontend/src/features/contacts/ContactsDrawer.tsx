import { useCallback, useState } from 'react'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { useBreakpoints } from 'src/modules/theme/useBreakpoints'
import { useAuth } from 'src/modules/auth/useAuth'
import { useWallet } from 'src/modules/wallet/useWallet'
import { LocalStorageKeys } from 'src/modules/localStorage/config'
import { useLocalStorage } from 'src/modules/localStorage/useLocalStorage'
import { useContacts } from 'src/services/hooks/account/useContacts'
import { ContactsSortType, ContactsSortDirection } from 'src/utils/contacts'
import { ActionsDrawer } from 'src/components/ActionsDrawer'
import { DrawerType } from 'src/modules/drawers/DrawerType'
import { DrawerContentNotConnected } from './DrawerContentNotConnected'
import { DrawerContentNoContact } from './DrawerContentNoContact'
import { DrawerContentContactForm } from './DrawerContentContactForm'
import { DrawerContentContactList } from './DrawerContentContactList'

export function ContactsDrawer() {
  const [sortType, setSortType] = useLocalStorage(
    LocalStorageKeys.Contacts.Sorting.Type
  )
  const [sortDirection, setSortDirection] = useLocalStorage(
    LocalStorageKeys.Contacts.Sorting.Direction
  )

  const { data: contacts, refresh } = useContacts(sortType, sortDirection)

  const { t } = useTranslation()
  const { isMobileView } = useBreakpoints()
  const { isAuthenticated } = useAuth()
  const { isWalletAvailable } = useWallet()
  const [mode, setMode] = useState<'viewContact' | 'addContact'>('viewContact')

  const handleAddContact = useCallback(() => {
    setMode('addContact')
  }, [])

  const handleCancel = useCallback(() => {
    setMode('viewContact')
  }, [])

  const handleSortAlphabetically = useCallback(() => {
    if (sortType === ContactsSortType.Alphabetically) {
      setSortDirection(prev =>
        prev === ContactsSortDirection.Asc
          ? ContactsSortDirection.Desc
          : ContactsSortDirection.Asc
      )
    } else {
      setSortType(ContactsSortType.Alphabetically)
      setSortDirection(ContactsSortDirection.Asc)
    }
  }, [sortType, setSortDirection, setSortType])

  const handleSortByDateAdded = useCallback(() => {
    if (sortType === ContactsSortType.DateAdded) {
      setSortDirection(prev =>
        prev === ContactsSortDirection.Asc
          ? ContactsSortDirection.Desc
          : ContactsSortDirection.Asc
      )
    } else {
      setSortType(ContactsSortType.DateAdded)
      setSortDirection(ContactsSortDirection.Asc)
    }
  }, [sortType, setSortDirection, setSortType])

  return (
    <ActionsDrawer
      title={t('contacts.contacts')}
      drawerType={DrawerType.Contacts}
      width={isMobileView
        ? '100%'
        : '520px'}
    >
      {isWalletAvailable && isAuthenticated
        ? (
          mode === 'addContact'
            ? (
              <DrawerContentContactForm onCancel={handleCancel} />
            )
            : contacts.length > 0
              ? (
                <DrawerContentContactList
                  contacts={contacts}
                  onAddContact={handleAddContact}
                  refresh={refresh}
                  onSortAlphabetically={handleSortAlphabetically}
                  onSortByDateAdded={handleSortByDateAdded}
                  sortType={sortType}
                  sortDirection={sortDirection}
                />
              )
              : (
                <DrawerContentNoContact onAddContact={handleAddContact} />
              )
        )
        : (
          <DrawerContentNotConnected refresh={refresh} />
        )}
    </ActionsDrawer>
  )
}
