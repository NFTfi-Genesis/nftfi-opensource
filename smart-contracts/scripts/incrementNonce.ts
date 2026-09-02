import { NonceManager } from '@ethersproject/experimental';
import hre from 'hardhat';

async function main(): Promise<void> {
  const { ethers, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();

  const signer = ethers.provider.getSigner(deployer) as any;
  const managedSigner = new NonceManager(signer);

  console.log(`Deployer account (${deployer}) nonce before: ${await managedSigner.getTransactionCount()}`);
  managedSigner.incrementTransactionCount(1);
  console.log(`Deployer account (${deployer}) nonce after: ${await managedSigner.getTransactionCount()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
