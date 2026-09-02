import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import { TestGaspMasks } from '../../typechain';
import { NFTfiContracts } from './deploy-contracts';
// Wraps the smart contract deploy script by deploying an NFT smart contract instance that is not whitelisted.
export async function deployNonPermittedNFT(
  nftfiSCOwner: Signer,
  validContracts: NFTfiContracts,
): Promise<NFTfiContracts> {
  // setup test NFT contract
  const GaspMasks = await ethers.getContractFactory('TestGaspMasks');
  const nftSC = (await GaspMasks.deploy()) as TestGaspMasks;
  await nftSC.waitForDeployment();

  // this is, what we are not doing to make it invalid
  // await permittedNFTs.setNFTPermit(nftSC.address, nftTypeERC721);

  return {
    ...validContracts,
    nft: nftSC,
  };
}
