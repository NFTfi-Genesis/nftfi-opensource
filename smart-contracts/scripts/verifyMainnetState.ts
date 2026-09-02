import 'dotenv/config';

import { Contract, JsonRpcProvider, encodeBytes32String, getAddress } from 'ethers';
import fs from 'fs-extra';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const DEPLOYMENTS_DIR = path.join(ROOT, 'deployments', 'mainnet');
const MANIFEST_PATH = path.join(ROOT, 'mainnet-contract-manifest.json');

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

interface KnownMainnetContract {
  name: string;
  address: string;
  status: string;
  expectedPaused?: boolean;
}

interface PackagedDeployment {
  name: string;
  address: string;
  deploymentTransaction: string | null;
  deploymentBlock: number | null;
  solcInputHash: string | null;
  compilerVersion: string | null;
  compilationTarget: string | null;
  artifact: string;
  compilerInput: string | null;
}

interface Manifest {
  chainId: number;
  knownMainnetContracts: {
    contracts: KnownMainnetContract[];
  };
  packagedDeployments: PackagedDeployment[];
}

function requireRpcUrl(): string {
  const directUrl = process.env.MAINNET_RPC_URL || process.env.ETH_MAINNET_RPC_URL;
  if (directUrl) return directUrl;
  if (process.env.ALCHEMY_API_KEY) {
    return `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  }
  if (process.env.INFURA_API_KEY) {
    return `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`;
  }
  throw new Error('Set MAINNET_RPC_URL (preferred), ETH_MAINNET_RPC_URL, ALCHEMY_API_KEY, or INFURA_API_KEY');
}

function assertEqual(actual: string, expected: string, label: string): void {
  if (getAddress(actual) !== getAddress(expected)) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertValueEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function readMetadata(artifact: DeploymentArtifact): JsonObject {
  if (!artifact.metadata) return {};
  return typeof artifact.metadata === 'string' ? JSON.parse(artifact.metadata) : artifact.metadata;
}

function expectedManifestEntry(name: string, file: string, artifact: DeploymentArtifact): PackagedDeployment {
  const metadata = readMetadata(artifact);
  const settings = (metadata.settings || {}) as JsonObject;
  const compilationTarget = (settings.compilationTarget || {}) as JsonObject;
  const compiler = (metadata.compiler || {}) as JsonObject;

  return {
    name,
    address: artifact.address,
    deploymentTransaction: artifact.receipt?.transactionHash || artifact.transactionHash || null,
    deploymentBlock: artifact.receipt?.blockNumber || null,
    solcInputHash: artifact.solcInputHash || null,
    compilerVersion: (compiler.version as string | undefined) || null,
    compilationTarget: Object.keys(compilationTarget)[0] || null,
    artifact: `deployments/mainnet/${file}`,
    compilerInput: artifact.solcInputHash ? `deployments/mainnet/solcInputs/${artifact.solcInputHash}.json` : null,
  };
}

async function verifyManifestArtifactParity(
  manifest: Manifest,
  artifactFiles: string[],
  artifacts: Map<string, DeploymentArtifact>,
): Promise<void> {
  const manifestByName = new Map(manifest.packagedDeployments.map(entry => [entry.name, entry]));
  if (manifestByName.size !== manifest.packagedDeployments.length) {
    throw new Error('Manifest contains duplicate packaged deployment names');
  }
  if (manifest.packagedDeployments.length !== artifactFiles.length) {
    throw new Error(
      `Manifest contains ${manifest.packagedDeployments.length} packaged deployments; found ${artifactFiles.length} artifacts`,
    );
  }

  for (const file of artifactFiles) {
    const name = path.basename(file, '.json');
    const artifact = artifacts.get(name);
    const manifestEntry = manifestByName.get(name);
    if (!artifact) throw new Error(`${name}: deployment artifact was not loaded`);
    if (!manifestEntry) throw new Error(`${name}: missing from manifest packagedDeployments`);

    const expected = expectedManifestEntry(name, file, artifact);
    assertEqual(manifestEntry.address, expected.address, `${name}: manifest address`);
    assertValueEqual(
      manifestEntry.deploymentTransaction,
      expected.deploymentTransaction,
      `${name}: manifest deployment transaction`,
    );
    assertValueEqual(manifestEntry.deploymentBlock, expected.deploymentBlock, `${name}: manifest deployment block`);
    assertValueEqual(manifestEntry.solcInputHash, expected.solcInputHash, `${name}: manifest solc input hash`);
    assertValueEqual(manifestEntry.compilerVersion, expected.compilerVersion, `${name}: manifest compiler version`);
    assertValueEqual(
      manifestEntry.compilationTarget,
      expected.compilationTarget,
      `${name}: manifest compilation target`,
    );
    assertValueEqual(manifestEntry.artifact, expected.artifact, `${name}: manifest artifact path`);
    assertValueEqual(manifestEntry.compilerInput, expected.compilerInput, `${name}: manifest compiler input path`);

    if (!(await fs.pathExists(path.join(ROOT, manifestEntry.artifact)))) {
      throw new Error(`${name}: manifest artifact path does not exist`);
    }
    if (manifestEntry.compilerInput && !(await fs.pathExists(path.join(ROOT, manifestEntry.compilerInput)))) {
      throw new Error(`${name}: manifest compiler input path does not exist`);
    }
  }
}

async function verifyRecordedPauseStates(
  provider: JsonRpcProvider,
  contracts: KnownMainnetContract[],
): Promise<number> {
  const contractsWithPauseState = contracts.filter(contract => contract.expectedPaused !== undefined);

  await Promise.all(
    contractsWithPauseState.map(async entry => {
      const contract = new Contract(entry.address, ['function paused() view returns (bool)'], provider);
      const actualPaused = (await contract.paused()) as boolean;
      if (actualPaused !== entry.expectedPaused) {
        throw new Error(`${entry.name}: expected paused=${entry.expectedPaused}, got paused=${actualPaused}`);
      }
      if (entry.expectedPaused && !entry.status.startsWith('paused')) {
        throw new Error(`${entry.name}: status ${entry.status} does not describe its recorded paused state`);
      }
      if (!entry.expectedPaused && entry.status.startsWith('paused')) {
        throw new Error(`${entry.name}: status ${entry.status} contradicts its recorded unpaused state`);
      }
    }),
  );

  return contractsWithPauseState.length;
}

async function verifyArtifact(provider: JsonRpcProvider, name: string, artifact: DeploymentArtifact): Promise<void> {
  const transactionHash = artifact.receipt?.transactionHash || artifact.transactionHash;
  if (!transactionHash) throw new Error(`${name}: deployment transaction hash missing`);

  const [receipt, transaction, code] = await Promise.all([
    provider.getTransactionReceipt(transactionHash),
    provider.getTransaction(transactionHash),
    provider.getCode(artifact.address),
  ]);

  if (!receipt) throw new Error(`${name}: deployment receipt not found`);
  if (receipt.status !== 1) throw new Error(`${name}: deployment receipt failed`);
  if (!receipt.contractAddress) throw new Error(`${name}: receipt has no contract address`);
  assertEqual(receipt.contractAddress, artifact.address, `${name}: receipt address mismatch`);
  if (code === '0x') throw new Error(`${name}: no runtime code at ${artifact.address}`);
  if (!transaction) throw new Error(`${name}: deployment transaction not found`);

  if (artifact.bytecode && !transaction.data.toLowerCase().startsWith(artifact.bytecode.toLowerCase())) {
    throw new Error(`${name}: creation transaction does not match artifact bytecode`);
  }
}

async function main(): Promise<void> {
  const provider = new JsonRpcProvider(requireRpcUrl(), 1, { staticNetwork: true });
  const network = await provider.getNetwork();
  if (network.chainId !== 1n) throw new Error(`Expected Ethereum mainnet chain ID 1, got ${network.chainId}`);

  const manifest = (await fs.readJson(MANIFEST_PATH)) as Manifest;
  if (manifest.chainId !== 1) throw new Error(`Manifest chain ID is ${manifest.chainId}, expected 1`);

  const artifactFiles = (await fs.readdir(DEPLOYMENTS_DIR))
    .filter(file => file.endsWith('.json'))
    .sort((left, right) => left.localeCompare(right));

  const artifacts = new Map<string, DeploymentArtifact>(
    await Promise.all(
      artifactFiles.map(
        async file =>
          [
            path.basename(file, '.json'),
            (await fs.readJson(path.join(DEPLOYMENTS_DIR, file))) as DeploymentArtifact,
          ] as [string, DeploymentArtifact],
      ),
    ),
  );

  await verifyManifestArtifactParity(manifest, artifactFiles, artifacts);

  for (let offset = 0; offset < artifactFiles.length; offset += 5) {
    const chunk = artifactFiles.slice(offset, offset + 5);
    await Promise.all(
      chunk.map(async file => {
        const name = path.basename(file, '.json');
        const artifact = artifacts.get(name);
        if (!artifact) throw new Error(`${name}: deployment artifact was not loaded`);
        await verifyArtifact(provider, name, artifact);
      }),
    );
    console.log(
      `Verified deployment artifacts ${Math.min(offset + chunk.length, artifactFiles.length)}/${artifactFiles.length}`,
    );
  }

  const hubArtifact = artifacts.get('NftfiHub');
  const coordinatorArtifact = artifacts.get('LoanCoordinator');
  const assetOfferArtifact = artifacts.get('AssetOfferLoan');
  const collectionOfferArtifact = artifacts.get('CollectionOfferLoan');
  const refinancingArtifact = artifacts.get('Refinancing');
  if (!hubArtifact || !coordinatorArtifact || !assetOfferArtifact || !collectionOfferArtifact || !refinancingArtifact) {
    throw new Error('Required core artifact missing');
  }

  const hub = new Contract(hubArtifact.address, ['function getContract(bytes32) view returns (address)'], provider);
  const coordinator = new Contract(
    coordinatorArtifact.address,
    [
      'function hub() view returns (address)',
      'function getDefaultLoanContractForOfferType(bytes32) view returns (address)',
    ],
    provider,
  );
  const refinancing = new Contract(
    refinancingArtifact.address,
    [
      'function hub() view returns (address)',
      'function targetLoanOfferContract() view returns (address)',
      'function targetLoanCollectionOfferContract() view returns (address)',
      'function getRefinancingAdapterOfType(bytes32) view returns (address)',
    ],
    provider,
  );

  assertEqual(
    await hub.getContract(encodeBytes32String('LOAN_COORDINATOR')),
    coordinatorArtifact.address,
    'Hub coordinator',
  );
  assertEqual(
    await hub.getContract(encodeBytes32String('REFINANCING')),
    refinancingArtifact.address,
    'Hub refinancing',
  );
  assertEqual(await coordinator.hub(), hubArtifact.address, 'Coordinator hub');
  assertEqual(
    await coordinator.getDefaultLoanContractForOfferType(encodeBytes32String('ASSET_OFFER_LOAN')),
    assetOfferArtifact.address,
    'Asset-offer route',
  );
  assertEqual(
    await coordinator.getDefaultLoanContractForOfferType(encodeBytes32String('COLLECTION_OFFER_LOAN')),
    collectionOfferArtifact.address,
    'Collection-offer route',
  );
  assertEqual(await refinancing.hub(), hubArtifact.address, 'Refinancing hub');
  assertEqual(await refinancing.targetLoanOfferContract(), assetOfferArtifact.address, 'Refinancing asset target');
  assertEqual(
    await refinancing.targetLoanCollectionOfferContract(),
    collectionOfferArtifact.address,
    'Refinancing collection target',
  );

  const adapterTypes: Record<string, string> = {
    NFTFI: 'NftfiRefinancingAdapter',
    NFTFI_LEGACY_V2_1: 'LegacyNftfiRefinancingAdapterV2_1',
    NFTFI_LEGACY_V2_3: 'LegacyNftfiRefinancingAdapterV2_3',
    ARCADEV3: 'ArcadeRefinancingAdapter',
    BLEND: 'BlendRefinancingAdapter',
    GONDI: 'GondiRefinancingAdapter',
  };

  for (const [adapterType, artifactName] of Object.entries(adapterTypes)) {
    const artifact = artifacts.get(artifactName);
    if (!artifact) throw new Error(`${artifactName}: artifact missing`);
    assertEqual(
      await refinancing.getRefinancingAdapterOfType(encodeBytes32String(adapterType)),
      artifact.address,
      `${adapterType} adapter`,
    );
  }

  const knownAddresses = [...new Set(manifest.knownMainnetContracts.contracts.map(contract => contract.address))];
  const knownCodes = await Promise.all(knownAddresses.map(address => provider.getCode(address)));
  const emptyKnownAddress = knownCodes.findIndex(code => code === '0x');
  if (emptyKnownAddress !== -1) {
    throw new Error(`No code at known address ${knownAddresses[emptyKnownAddress]}`);
  }

  const verifiedPauseStates = await verifyRecordedPauseStates(provider, manifest.knownMainnetContracts.contracts);

  console.log(`Verified exact manifest parity for ${artifactFiles.length} packaged deployment artifacts.`);
  console.log(`Verified ${artifactFiles.length} packaged deployment artifacts on Ethereum mainnet.`);
  console.log(`Verified ${knownAddresses.length} known mainnet contract addresses.`);
  console.log(`Verified ${verifiedPauseStates} recorded pause states.`);
  console.log(`Verified configured Refinancing and ${Object.keys(adapterTypes).length} registered adapter types.`);
  provider.destroy();
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
