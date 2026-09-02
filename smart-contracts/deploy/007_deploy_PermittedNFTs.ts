import fs from 'fs-extra';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import path from 'path';
import { toBytes32 } from '../test/utils/utils';
import { PermittedNFTsAndTypeRegistry } from '../typechain';
import { startLog, succeedLog, updateLog } from './utils/logs';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, network, deployments, getNamedAccounts } = hre;

  // reusing old deployment on goerli and mainnet
  let permittedNFTs = (await ethers.getContractOrNull('PermittedNFTsAndTypeRegistry')) as PermittedNFTsAndTypeRegistry;
  if (!permittedNFTs || !(network.name.toLowerCase() === 'mainnet' || network.name.toLowerCase() === 'goerli')) {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    const permittedLists = await fs.readJSON(
      path.join(`deploy/config/permittedList.${network.name.toLowerCase()}.json`),
    );

    const deploymentNftAddressesBatch = permittedLists.NFT.deploymentBatch.map((nft: any) => nft.address);
    const deploymentNftTypesBatch = permittedLists.NFT.deploymentBatch.map((nft: any) => nft.type);

    const contractKeyUtils = await ethers.getContract('ContractKeyUtils');

    const nftTypeERC721 = 'ERC721';
    const nftTypeCryptoKitties = 'CryptoKitties';
    const nftTypeERC721Legacy = 'ERC721_LEGACY';
    const nftTypeERC1155 = 'ERC1155';
    const nftTypePunks = 'PUNKS';
    const nftTypeSuperRareV1 = 'SUPER_RARE_V1';

    const erc721Wrapper = await ethers.getContract('ERC721Wrapper');
    const kittiesWrapper = await ethers.getContract('CryptoKittiesWrapper');
    const erc721LegacyWrapper = await ethers.getContract('ERC721LegacyWrapper');
    const erc1155Wrapper = await ethers.getContract('ERC1155Wrapper');
    const punkWrapper = await ethers.getContract('PunkWrapper');
    const superRareV1Wrapper = await ethers.getContract('SuperRareV1Wrapper');

    await deploy('PermittedNFTsAndTypeRegistry', {
      from: deployer,
      args: [
        deployer,
        [nftTypeERC721, nftTypeCryptoKitties, nftTypeERC721Legacy, nftTypeERC1155, nftTypePunks, nftTypeSuperRareV1],
        [
          await erc721Wrapper.getAddress(),
          await kittiesWrapper.getAddress(),
          await erc721LegacyWrapper.getAddress(),
          await erc1155Wrapper.getAddress(),
          await punkWrapper.getAddress(),
          await superRareV1Wrapper.getAddress(),
        ],
        deploymentNftAddressesBatch,
        deploymentNftTypesBatch,
      ],
      log: true,
      libraries: {
        ContractKeyUtils: await contractKeyUtils.getAddress(),
      },
      gasLimit: 12450000,
    });

    // Get all deployed contracts
    permittedNFTs = (await ethers.getContract('PermittedNFTsAndTypeRegistry')) as PermittedNFTsAndTypeRegistry;

    let batchGasUsed = 0n;

    for (const batch of permittedLists.NFT.postDeploymentBatches) {
      startLog('Setting NFT batch as permitted');
      const nftAddressesBatch = batch.map((nft: any) => nft.address);
      const nftTypesBatch = batch.map((nft: any) => nft.type);

      let correctPermissions: boolean = true;
      let batchCounter: number = 0;

      while (correctPermissions && batchCounter < nftAddressesBatch.length) {
        correctPermissions =
          (await permittedNFTs.getNFTPermit(nftAddressesBatch[batchCounter])) == toBytes32(nftTypesBatch[batchCounter]);
        batchCounter += 1;
      }

      if (correctPermissions) {
        succeedLog(`NFT batch already set up as permitted`);
      } else {
        const tx = await permittedNFTs.setNFTPermits(nftAddressesBatch, nftTypesBatch, { gasLimit: 12450000 });
        updateLog(`Setting NFT batch as permitted (tx: ${tx.hash})`);

        const receipt = await tx.wait();

        succeedLog(`Setting NFT batch as permitted (tx: ${tx.hash})...used ${receipt?.gasUsed.toString()} gas`);
        batchGasUsed += receipt?.gasUsed ? receipt?.gasUsed : 0n;
      }
    }
    console.log('NFT batch total gas cost', batchGasUsed);
  } else {
    console.log('Reusing PermittedNFTsAndTypeRegistry at', await permittedNFTs.getAddress());
  }
};

export default func;

func.tags = ['PermittedNFTs'];
