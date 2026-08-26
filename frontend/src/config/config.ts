import { fromError } from 'zod-validation-error'
import { buildConfig, Config, ConfigError } from 'src/config/buildConfig'

export const config = buildConfig(import.meta.env) as Config
if (config instanceof ConfigError) {
  alert(fromError(config).toString())
  throw config
}
