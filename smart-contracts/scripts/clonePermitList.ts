import hre from 'hardhat';
import fs from 'fs-extra';
import { PermittedNFTsAndTypeRegistry } from '../typechain';
import { join } from 'path';

async function main(): Promise<void> {
  const { ethers, getNamedAccounts } = hre;
  const network = hre.network.name;

  const { deployer } = await getNamedAccounts();

  const permittedNFTs = (await ethers.getContract(
    'PermittedNFTsAndTypeRegistry',
    deployer,
  )) as PermittedNFTsAndTypeRegistry;

  const events = await permittedNFTs.queryFilter(permittedNFTs.getEvent('NFTPermit'), 0, 'latest');

  const permittedList: any[] = [];

  for (const event of events) {
    const nftType = await permittedNFTs.getNFTPermit(event.args.nftContract);
    if (nftType !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      permittedList.push({ address: event.args.nftContract, type: hexToAscii(formatNftType(nftType)) });
    }
  }

  const BATCH_SIZE = 250;
  const fileName = join(__dirname, '../deploy/config', `permittedList.${network}.json`);

  const currentList = await fs.readJson(fileName);
  const newList = { ...currentList };

  newList.NFT.deploymentBatch = permittedList.slice(0, BATCH_SIZE);
  newList.NFT.postDeploymentBatches = [];

  let i = BATCH_SIZE;
  while (i <= permittedList.length - 1) {
    newList.NFT.postDeploymentBatches.push(permittedList.slice(i, i + BATCH_SIZE));
    i += BATCH_SIZE;
  }

  await fs.writeJSON(fileName, newList, { spaces: 2, EOL: '\r\n' });
}

function hexToAscii(hexString: string): string {
  let asciiString = '';
  for (let i = 0; i < hexString.length; i += 2) {
    const hexCode = hexString.substring(i, i + 2);
    const asciiCode = parseInt(hexCode, 16);
    asciiString += String.fromCharCode(asciiCode);
  }
  return asciiString;
}

function formatNftType(nftType: string): string {
  return nftType.replace('0x', '').replace(/00+$/, '');
}

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
