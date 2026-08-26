import { fromError } from 'zod-validation-error'
import { buildConfig, ConfigError } from 'src/config/buildConfig'

// This validates the config in the runtime and logs the error if it fails.
// If you want to run `yarn validate-config` locally, first export the environment variables from the .env file to your shell:
// export $(grep -v '^#' .env | sed 's/\s*#.*//' | xargs)

const config = buildConfig(process.env)
if (config instanceof ConfigError) {
  console.error(fromError(config).toString())
  process.exit(1)
}
