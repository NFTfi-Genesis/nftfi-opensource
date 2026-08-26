// TODO: Remove and replace open calls with direct usage of setDrawerOpen(DrawerType.Contacts, true)

import { createContext, useContext, useState, ReactNode } from 'react'

interface ContactsDrawerContextType {
  isOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
  hasApprovedTC: boolean
  setHasApprovedTC: (value: boolean) => void
}

const ContactsDrawerContext = createContext<
  ContactsDrawerContextType | undefined
>(undefined)

export function ContactsDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [hasApprovedTC, setHasApprovedTC] = useState(true)

  const openDrawer = () => setIsOpen(true)
  const closeDrawer = () => setIsOpen(false)

  return (
    <ContactsDrawerContext.Provider
      value={{
        isOpen,
        openDrawer,
        closeDrawer,
        hasApprovedTC,
        setHasApprovedTC,
      }}
    >
      {children}
    </ContactsDrawerContext.Provider>
  )
}

export function useContactsDrawer() {
  const context = useContext(ContactsDrawerContext)
  if (context === undefined) {
    throw new Error(
      'useContactsDrawer must be used within a ContactsDrawerProvider'
    )
  }
  return context
}
