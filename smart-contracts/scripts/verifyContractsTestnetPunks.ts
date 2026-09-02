import fs from 'fs-extra';
import hre from 'hardhat';
import { join } from 'path';
import { etherscanVerification } from './utils/verify';

// NOTE: This script may fail at some the verifications, if so, comment the verification steps that run successfully and run this script again.

async function main(): Promise<void> {
  const network = hre.network.name;

  const deploymentPath = join(__dirname, `../deployments/${network}`);

  const testnetPunks = await fs.readJson(join(deploymentPath, 'TestnetPunks.json'));

  console.log('Verifying TestnetPunks');
  await etherscanVerification({
    address: testnetPunks.address,
    constructorArguments: testnetPunks.args,
  });
}

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
