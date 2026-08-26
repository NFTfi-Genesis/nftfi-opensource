import { Children, ComponentType, isValidElement, MemoExoticComponent, ReactElement } from 'react'

export function getBaseType(el: ReactElement): unknown {
  const t = el.type as unknown
  // Unwrap React.memo
  if (
    typeof t === 'object'
    && t !== null
    // `$$typeof` check avoids importing react-is
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - $$typeof is intentionally not in types
    && t.$$typeof === Symbol.for('react.memo')
  ) {
    const memo = t as MemoExoticComponent<ComponentType<unknown>>
    return memo.type as unknown
  }
  return t
}

/** Type guard: element is of a specific component type (works with memo-wrapped) */
export function isElementOfType<P>(
  el: ReactElement<unknown>,
  Comp: React.ComponentType<P>
): el is ReactElement<P> {
  return getBaseType(el) === Comp
}

export function lookupChildren<P>(children: React.ReactNode[], component: React.ComponentType<P>[]): React.ReactElement<P>[] {
  const result: React.ReactElement[] = []
  Children.forEach(children, child => {
    if (!isValidElement(child)) return
    if (isElementOfType(child, component[result.length])) result.push(child)
  })
  return result
}
