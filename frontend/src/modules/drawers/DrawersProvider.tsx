import { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import { useLocalStorage } from 'src/modules/localStorage/useLocalStorage'
import { LocalStorageKeys } from 'src/modules/localStorage/config'
import { DrawerType } from './DrawerType'

type DrawersContextType = {
  pinnedDrawer: DrawerType | null
  pinDrawer: (drawerType: DrawerType) => void
  unpinDrawer: () => void
  setDrawerOpen: (drawerType: DrawerType, open: boolean) => void
  isDrawerOpen: (drawerType?: DrawerType) => boolean
  isDrawerPinned: (drawerType?: DrawerType) => boolean
  drawerWidth: string | null
  setDrawerWidth: (width: string | null) => void
}

const DrawersContext = createContext<DrawersContextType | undefined>(undefined)

export function DrawersProvider({ children }: { children: ReactNode }) {
  const [pinnedDrawer, setPinnedDrawer] = useLocalStorage(
    LocalStorageKeys.Drawers.PinnedDrawer
  )
  const [openDrawer, setOpenDrawer] = useState<DrawerType | null>(null)
  const [drawerWidth, setDrawerWidth] = useState<string | null>(null)

  const pinDrawer = useCallback((drawerType: DrawerType) => {
    setPinnedDrawer(drawerType)
    setOpenDrawer(drawerType)
  }, [setPinnedDrawer, setOpenDrawer])
  const unpinDrawer = useCallback(() => {
    setPinnedDrawer(null)
    setDrawerWidth(null)
  }, [setPinnedDrawer])

  const isDrawerPinned = useCallback((drawerType?: DrawerType) => {
    if (!drawerType) return !!pinnedDrawer
    return pinnedDrawer === drawerType
  }, [pinnedDrawer])

  const isDrawerOpen = useCallback((drawerType?: DrawerType) => {
    if (!drawerType) return !!(openDrawer || pinnedDrawer)
    return pinnedDrawer === drawerType || openDrawer === drawerType
  }, [openDrawer, pinnedDrawer])

  const setDrawerOpen = useCallback((drawerType: DrawerType, open: boolean) => {
    if (open === false) {
      setPinnedDrawer(null)
      setDrawerWidth(null)
      return setOpenDrawer(null)
    }

    if (isDrawerPinned(drawerType)) return
    setOpenDrawer(drawerType)
  }, [isDrawerPinned, setPinnedDrawer, setOpenDrawer])

  return (
    <DrawersContext.Provider
      value={{
        pinnedDrawer,
        pinDrawer,
        unpinDrawer,
        setDrawerOpen,
        isDrawerOpen,
        isDrawerPinned,
        drawerWidth,
        setDrawerWidth,
      }}
    >
      {children}
    </DrawersContext.Provider>
  )
}

export function useDrawers() {
  const context = useContext(DrawersContext)
  if (context === undefined) {
    throw new Error('useDrawers must be used within a DrawersProvider')
  }
  return context
}
