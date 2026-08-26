import { TKey } from 'src/modules/translation/TKey'

export type TFunction = (key: TKey, options?: Record<string, unknown>) => string
