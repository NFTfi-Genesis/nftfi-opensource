import fs from 'fs-extra';
import hre from 'hardhat';
import { join } from 'path';
import { etherscanVerification } from './utils/verify';

// NOTE: This script may fail at some the verifications, if so, comment the verification steps that run successfully and run this script again.

async function main(): Promise<void> {
  const network = hre.network.name;

  const deploymentPath = join(__dirname, `../deployments/${network}`);

  const mockDyDxFlashloan = await fs.readJson(join(deploymentPath, 'MockDyDxFlashloan.json'));

  console.log('Verifying MockDyDxFlashloan');
  await etherscanVerification({
    address: mockDyDxFlashloan.address,
    constructorArguments: mockDyDxFlashloan.args,
  });
}

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
