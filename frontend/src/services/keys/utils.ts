import { DataKey } from './types'

// Return null if any of the substituted values are null or undefined.
// Key being null will prevent the fetcher from being called.
// Note: Empty strings are allowed as they represent valid query strings with no parameters.
export function dataKey(strings: TemplateStringsArray, ...values: unknown[]): DataKey {
  if (values.some(v => v === null || v === undefined)) return null
  return `datakey-${strings.reduce((acc: string, str: string, i: number) => acc + str + (values[i] ?? ''), '')}`
}

export function namespace(namespace: string) {
  return (key: DataKey) => typeof key === 'string' && key!.startsWith(dataKey`${namespace}`!)
}

export const dataKeyWithNamespace = (namespace: string) => (strings: TemplateStringsArray, ...values: unknown[]): DataKey => {
  if (values.some(v => v === null || v === undefined)) return null
  return `datakey-${namespace}-${strings.reduce((acc: string, str: string, i: number) => acc + str + (values[i] ?? ''), '')}`
}
