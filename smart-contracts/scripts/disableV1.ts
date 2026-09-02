import hre from 'hardhat';
import { startLog, succeedLog, updateLog } from '../deploy/utils/logs';

async function main(): Promise<void> {
  const { ethers, getNamedAccounts } = hre;
  const { v1Admin } = await getNamedAccounts();

  const network = hre.network.name;
  const v1Address = process.env[`${network.toUpperCase()}_V1_ADDRESS`];

  if (v1Address) {
    startLog('Disabling V1');
    const v1Contract = await ethers.getContractAt(
      ['function updateMaximumNumberOfActiveLoans(uint256 _newMaximumNumberOfActiveLoans)'],
      v1Address,
      v1Admin,
    );
    const tx = await v1Contract.updateMaximumNumberOfActiveLoans(0);
    updateLog(`Disabling V1 (tx: ${tx.hash})`);
    await tx.wait();
    succeedLog(`V1 disabled (tx: ${tx.hash})`);
  } else new Error('V1_ADDRESS is not set');
}

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
