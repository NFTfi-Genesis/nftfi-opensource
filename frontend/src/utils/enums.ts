export function enumToArray<T extends Record<string, string | number>>(enumObj: T): T[keyof T][] {
  return Object.values(enumObj) as T[keyof T][]
}
