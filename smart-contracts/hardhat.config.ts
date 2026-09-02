import '@nomicfoundation/hardhat-ethers';
import 'hardhat-deploy';
import 'hardhat-deploy-ethers';
import '@nomicfoundation/hardhat-verify';
import '@nomicfoundation/hardhat-chai-matchers';
import '@typechain/hardhat';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import '@nomicfoundation/hardhat-foundry';
import 'hardhat-contract-sizer';
import { HardhatUserConfig, NetworkUserConfig } from 'hardhat/types';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// --- Begin: v5 address/tx formatting patch (stop INVALID_ARGUMENT on creation tx) ---
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const v5providers = require('@ethersproject/providers');

  if (v5providers?.Formatter?.prototype) {
    const F = v5providers.Formatter.prototype;

    // 1) Make address formatter treat "" like null (creation tx)
    const _address = F.address;
    F.address = function (value: any) {
      if (value === '') return null; // <-- key fix
      return _address.call(this, value);
    };

    // 2) Extra guard: fix raw tx objects before the rest of formatting
    const _txResp = F.transactionResponse;
    F.transactionResponse = function (value: any) {
      if (value && value.to === '') value.to = null; // normalize early
      return _txResp.call(this, value);
    };
  }
} catch {
  // ethers v5 providers not present; ignore
}
// --- End: v5 patch ---

// By default, disable Tenderly automatic verification unless deploying to virtual-mainnet
const networkIndex = process.argv.indexOf('--network');
const selectedNetwork = networkIndex === -1 ? '' : process.argv[networkIndex + 1];
const tenderlyPluginEnabled = selectedNetwork === 'virtual-mainnet' || process.env.TENDERLY_PLUGIN_ENABLED === 'true';
if (!tenderlyPluginEnabled) {
  process.env.TENDERLY_AUTOMATIC_VERIFICATION = 'false';
} else {
  process.env.TENDERLY_AUTOMATIC_VERIFICATION = 'true';
}
process.env.TENDERLY_ENABLE_OUTDATED_VERSION_CHECK ||= 'false';

if (tenderlyPluginEnabled) {
  // Load after the flags above are set so ordinary local builds stay offline.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('@tenderly/hardhat-tenderly');
}

dotenvConfig({ path: resolve(__dirname, './.env') });

// Tenderly plugin now automatically handles setup via environment variables
// Use TENDERLY_AUTOMATIC_VERIFICATION=true to enable automatic verification

const chainIds = {
  localhost: 1,
  hardhat: 1,
  'eth-mainnet': 1,
  'eth-sepolia': 11155111,
  'base-mainnet': 8453,
  'base-sepolia': 84532,
  'virtual-mainnet': 1,
};

const infuraApiKey = process.env.INFURA_API_KEY || '';
const alchemyApiKey = process.env.ALCHEMY_API_KEY || '';
const gasPrice = parseInt(process.env.GAS_PRICE || '1000000000');
const etherscanApiKey = process.env.ETHERSCAN_KEY || '';
const tenderlyNetworkSlug = process.env.TENDERLY_NETWORK_SLUG || '';
const tenderlyUsername = process.env.TENDERLY_USERNAME || '';
const tenderlyProject = process.env.TENDERLY_PROJECT || '';

function getNetworkEnvPrefix(network: keyof typeof chainIds): string {
  return network.toUpperCase().replace(/-/g, '_');
}

function getRpcUrl(network: keyof typeof chainIds): string {
  const networkOverride = process.env[`${getNetworkEnvPrefix(network)}_RPC_URL`];
  if (networkOverride) return networkOverride;

  if (network === 'eth-mainnet' && process.env.MAINNET_RPC_URL) return process.env.MAINNET_RPC_URL;
  if (network === 'virtual-mainnet') {
    return (
      process.env.VIRTUAL_MAINNET_RPC_URL ||
      (tenderlyNetworkSlug ? `https://virtual.mainnet.rpc.tenderly.co/${tenderlyNetworkSlug}` : '')
    );
  }

  if (infuraApiKey) return `https://${network}.infura.io/v3/${infuraApiKey}`;
  if (alchemyApiKey) return `https://${network}.g.alchemy.com/v2/${alchemyApiKey}`;
  return '';
}

function createNetworkConfig(network: keyof typeof chainIds): NetworkUserConfig {
  const envPrefix = getNetworkEnvPrefix(network);
  const legacyPrefix = network.toUpperCase();
  const privateKey = process.env[`${envPrefix}_PRIVATE_KEY`] || process.env[`${legacyPrefix}_PRIVATE_KEY`];
  const v1AdminPK = process.env[`${envPrefix}_V1_PRIVATE_KEY`] || process.env[`${legacyPrefix}_V1_PRIVATE_KEY`];
  const accounts: string[] = [];
  if (privateKey) {
    accounts.push(privateKey);
    if (v1AdminPK) accounts.push(v1AdminPK);
  }

  return {
    ...(accounts.length > 0 ? { accounts } : {}),
    chainId: chainIds[network],
    url: getRpcUrl(network),
    gasPrice,
  };
}

const hardhatNetwork: NetworkUserConfig = {
  chainId: chainIds.hardhat,
};

const mainnetForkUrl = getRpcUrl('eth-mainnet');
if (mainnetForkUrl) {
  hardhatNetwork.forking = {
    url: mainnetForkUrl,
    blockNumber: 21037753,
  };
}

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  gasReporter: {
    currency: 'USD',
    enabled: process.env.REPORT_GAS ? true : false,
    excludeContracts: [],
    src: './contracts',
  },
  networks: {
    localhost: {
      chainId: chainIds.localhost,
      gasPrice: 10000000000, // 10 gwei
      gas: 2100000,
      allowUnlimitedContractSize: true,
    },
    hardhat: hardhatNetwork,
    mainnet: createNetworkConfig('eth-mainnet'),
    sepolia: createNetworkConfig('eth-sepolia'),
    'base-sepolia': createNetworkConfig('base-sepolia'),
    'base-mainnet': createNetworkConfig('base-mainnet'),
    'virtual-mainnet': createNetworkConfig('virtual-mainnet'),
  },
  paths: {
    artifacts: './artifacts',
    cache: './cache',
    sources: './contracts',
    tests: './test',
  },
  solidity: {
    version: '0.8.19',
    settings: {
      metadata: {
        // Not including the metadata hash
        // https://github.com/paulrberg/solidity-template/issues/31
        bytecodeHash: 'none',
      },
      // You should disable the optimizer when debugging
      // https://hardhat.org/hardhat-network/#solidity-optimizer-support
      optimizer: {
        enabled: true,
        runs: 900,
      },
    },
  },
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v6',
  },
  namedAccounts: {
    deployer: 0,
    v1Admin: 1,
  },
  etherscan: {
    apiKey: etherscanApiKey,
  },
  tenderly: {
    project: tenderlyProject,
    username: tenderlyUsername,
    privateVerification: true,
  },
};

export default config;
