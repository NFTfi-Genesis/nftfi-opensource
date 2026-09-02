import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

dotenvConfig({ path: resolve(__dirname, './.env') });

export function getOwnerAddress(network: string, deployer: string): string {
  const normalizedNetwork = network.toUpperCase().replace(/-/g, '_');
  const legacyNetwork = network.toUpperCase();
  const configuredOwner =
    process.env[`${normalizedNetwork}_OWNER_ADDRESS`] || process.env[`${legacyNetwork}_OWNER_ADDRESS`];

  if (network === 'mainnet') {
    const mainnetOwner =
      process.env.ETH_MAINNET_OWNER_ADDRESS || process.env['ETH-MAINNET_OWNER_ADDRESS'] || configuredOwner;
    if (!mainnetOwner) {
      throw new Error('No owner address defined for mainnet deployment!');
    }
    return mainnetOwner;
  }

  return configuredOwner || deployer;
}
