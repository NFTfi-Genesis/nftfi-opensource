export type DataKey = `datakey-${string}` | null

export type DataKeyMatcher = DataKey | Array<DataKey> | ((key: DataKey) => boolean)
