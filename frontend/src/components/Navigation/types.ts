export interface NavSectionProps {
  subheader: string
  items: NavItemProps[]
}

export interface NavItemChild {
  title: string
  path: string
}

export interface NavItemProps {
  title: string
  path?: string
  icon?: string
  iconSvg?: React.ReactElement
  children?: NavItemChild[]
  info?: React.ReactNode
  external?: boolean
}

export interface NavComponentProps {
  item: NavItemProps
  open: boolean
  onOpen: (value: boolean) => void
  active: string
  collapsed: boolean
}
