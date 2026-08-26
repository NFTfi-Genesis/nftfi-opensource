import { BrandedNonStrict, KeyPaths } from 'src/typesUtils'
import translations from 'src/assets/translations/en.json'

export type TKey = BrandedNonStrict<KeyPaths<typeof translations>, 'TKey'>
