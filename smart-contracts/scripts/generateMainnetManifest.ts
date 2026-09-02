import fs from 'fs-extra';
import path from 'path';
import { isDeepStrictEqual } from 'util';

const ROOT = path.resolve(__dirname, '..');
const DEPLOYMENTS_DIR = path.join(ROOT, 'deployments', 'mainnet');
const OUTPUT_PATH = path.join(ROOT, 'mainnet-contract-manifest.json');

type JsonObject = Record<string, unknown>;

interface DeploymentArtifact extends JsonObject {
  address: string;
  bytecode?: string;
  metadata?: string | JsonObject;
  receipt?: {
    blockNumber?: number;
    transactionHash?: string;
  };
  solcInputHash?: string;
  transactionHash?: string;
}

const knownMainnetContracts = [
  {
    name: 'AssetOfferLoanV3',
    address: '0x9F10D706D789e4c76A1a6434cd1A9841c875C0A6',
    status: 'paused',
    role: 'asset-loan-v3',
    expectedPaused: true,
  },
  {
    name: 'DirectLoanFixedOfferV2_3',
    address: '0xd0a40eB7FD94eE97102BA8e9342243A2b2E22207',
    status: 'paused-legacy',
    role: 'asset-loan-v2.3',
    expectedPaused: true,
  },
  {
    name: 'DirectLoanFixedOfferV2_1',
    address: '0x8252Df1d8b29057d1Afe3062bf5a64D503152BC8',
    status: 'paused-legacy',
    role: 'asset-loan-v2.1',
    expectedPaused: true,
  },
  {
    name: 'DirectLoanFixedOfferV2',
    address: '0xf896527c49b44aAb3Cf22aE356Fa3AF8E331F280',
    status: 'paused-legacy',
    role: 'asset-loan-v2',
    expectedPaused: true,
  },
  {
    name: 'DirectLoanFixedOfferV1',
    address: '0x88341d1a8F672D2780C8dC725902AAe72F143B0c',
    status: 'paused-legacy',
    role: 'asset-loan-v1',
    expectedPaused: true,
  },
  {
    name: 'CollectionOfferLoanV3',
    address: '0xB6adEc2ACc851d30d5fB64f3137234BCDCBBad0D',
    status: 'paused',
    role: 'collection-loan-v3',
    expectedPaused: true,
  },
  {
    name: 'DirectLoanFixedCollectionOfferV2_3',
    address: '0xD0C6e59B50C32530C627107F50Acc71958C4341F',
    status: 'paused-legacy',
    role: 'collection-loan-v2.3',
    expectedPaused: true,
  },
  {
    name: 'DirectLoanFixedCollectionOfferV2',
    address: '0xE52Cec0E90115AbeB3304BaA36bc2655731f7934',
    status: 'paused-legacy',
    role: 'collection-loan-v2',
    expectedPaused: true,
  },
  {
    name: 'Escrow',
    address: '0x2ae3e46290AdE43593eabd15642eBD67157f5351',
    status: 'active',
    role: 'escrow',
  },
  {
    name: 'ERC20TransferManager',
    address: '0x6730697f33d6D2490029b32899E7865c0d902Ca0',
    status: 'active',
    role: 'erc20-transfer-manager',
  },
  {
    name: 'LoanCoordinator',
    address: '0xA6D93ABC54268Cf849a93e867c129786f04fd2e6',
    status: 'active',
    role: 'loan-coordinator',
  },
  {
    name: 'PromissoryNote',
    address: '0x77B53beb7f13Bd38de9F76Eed2F2c4F9efff7f4C',
    status: 'active',
    role: 'lender-note',
  },
  {
    name: 'ObligationReceipt',
    address: '0x48ed998e778Ab2663b6C49Bd09DfFF8Efd16B934',
    status: 'active',
    role: 'borrower-note',
  },
  {
    name: 'RefinancingV3',
    address: '0x4BC5Fa56f2931E7A37417FA55Dda71E4b7c2f2a3',
    status: 'paused',
    role: 'refinancing-v3',
    expectedPaused: true,
  },
  {
    name: 'RefinancingV3Initial',
    address: '0x6701B1D2E6d34727c0C37cDBd0cF421d3357DD0c',
    status: 'paused-legacy',
    role: 'initial-refinancing',
    expectedPaused: true,
  },
  {
    name: 'RefinancingV2_3',
    address: '0x25fF4B398cD97B5bFBbE68378Aae1F23CBe13bBA',
    status: 'paused-legacy',
    role: 'refinancing-v2.3',
    expectedPaused: true,
  },
  {
    name: 'NftfiBundler',
    address: '0x0259119359Bf053ebF42C9807752de6bbb4925f3',
    status: 'active-external-to-this-deployment-set',
    role: 'bundle-builder',
    expectedPaused: false,
  },
  {
    name: 'ImmutableBundler',
    address: '0x46C9CFB32627B74F91e0B5ad575c247AEc7e7847',
    status: 'active-external-to-this-deployment-set',
    role: 'bundle-sealer',
    expectedPaused: false,
  },
];

function categoryFor(name: string): string {
  if (name === 'Refinancing') return 'refinancing';
  if (name.includes('RefinancingAdapter')) return 'refinancing-adapter';
  if (name.includes('Wrapper')) return 'nft-wrapper';
  if (name.includes('Escrow')) return 'escrow';
  if (name.includes('SigningUtils') || name.includes('ContractKey') || name === 'LoanChecksAndCalculations') {
    return 'library-or-utility';
  }
  if (name.includes('Note') || name.includes('Receipt')) return 'smart-nft';
  if (name.includes('Loan')) return 'loan-core';
  return 'protocol-support';
}

function readMetadata(artifact: DeploymentArtifact): JsonObject {
  if (!artifact.metadata) return {};
  return typeof artifact.metadata === 'string' ? JSON.parse(artifact.metadata) : artifact.metadata;
}

async function main(): Promise<void> {
  const files = (await fs.readdir(DEPLOYMENTS_DIR))
    .filter(file => file.endsWith('.json'))
    .sort((left, right) => left.localeCompare(right));

  const contracts = await Promise.all(
    files.map(async file => {
      const artifact = (await fs.readJson(path.join(DEPLOYMENTS_DIR, file))) as DeploymentArtifact;
      const metadata = readMetadata(artifact);
      const settings = (metadata.settings || {}) as JsonObject;
      const compilationTarget = (settings.compilationTarget || {}) as JsonObject;
      const compiler = (metadata.compiler || {}) as JsonObject;
      const name = path.basename(file, '.json');

      return {
        name,
        category: categoryFor(name),
        address: artifact.address,
        deploymentTransaction: artifact.receipt?.transactionHash || artifact.transactionHash || null,
        deploymentBlock: artifact.receipt?.blockNumber || null,
        solcInputHash: artifact.solcInputHash || null,
        compilerVersion: compiler.version || null,
        compilationTarget: Object.keys(compilationTarget)[0] || null,
        artifact: `deployments/mainnet/${file}`,
        compilerInput: artifact.solcInputHash ? `deployments/mainnet/solcInputs/${artifact.solcInputHash}.json` : null,
      };
    }),
  );

  const manifest = {
    schemaVersion: 3,
    chainId: 1,
    network: 'ethereum-mainnet',
    release: {
      protocolVersion: 'V3',
      snapshotDate: '2026-08-31',
      license: 'MIT',
      provenanceModel: 'self-contained-mainnet',
    },
    knownMainnetContracts: {
      snapshotDate: '2026-08-31',
      contracts: knownMainnetContracts,
    },
    packagedDeployments: contracts,
  };

  if (process.argv.includes('--check')) {
    const existingManifest = await fs.readJson(OUTPUT_PATH);
    if (!isDeepStrictEqual(existingManifest, manifest)) {
      throw new Error('Mainnet manifest is stale. Run yarn manifest:mainnet and commit the result.');
    }
    console.log(`Verified generated manifest for ${contracts.length} mainnet deployments.`);
    return;
  }

  await fs.writeJson(OUTPUT_PATH, manifest, { spaces: 2 });
  console.log(`Wrote ${contracts.length} mainnet deployments to ${path.relative(ROOT, OUTPUT_PATH)}`);
}

main().catch((error: Error) => {
  console.error(error);
  process.exitCode = 1;
});
