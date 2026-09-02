import fs from 'fs-extra';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { getOwnerAddress } from './utils/owner-address';

import path from 'path';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, getNamedAccounts, deployments, network } = hre;

  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  const nftfiHub = await ethers.getContract('NftfiHub');

  const nftfiSigningUtils = await deploy('NFTfiSigningUtils', {
    from: deployer,
    log: true,
  });

  const loanChecksAndCalculations = await deploy('LoanChecksAndCalculations', {
    from: deployer,
    log: true,
  });

  const contractKeys = await ethers.getContract('ContractKeys');
  const contractKeysAddress = await contractKeys.getAddress();
  const contractKeyUtils = await ethers.getContract('ContractKeyUtils');

  const permittedLists = await fs.readJSON(path.join(`deploy/config/permittedList.${network.name.toLowerCase()}.json`));

  const ownerAddress = getOwnerAddress(network.name.toLowerCase(), deployer);

  const loanOfferDeploymentData = await deploy('AssetOfferLoan', {
    from: deployer,
    args: [ownerAddress, await nftfiHub.getAddress(), permittedLists.ERC20],
    libraries: {
      NFTfiSigningUtils: nftfiSigningUtils.address,
      LoanChecksAndCalculations: loanChecksAndCalculations.address,
      ContractKeys: contractKeysAddress,
      ContractKeyUtils: await contractKeyUtils.getAddress(),
    },
    log: true,
  });

  console.log(' AssetOfferLoan deployed byte size: ', (loanOfferDeploymentData.deployedBytecode || '').length / 2);

  const collectionOfferDeploymentData = await deploy('CollectionOfferLoan', {
    from: deployer,
    args: [ownerAddress, await nftfiHub.getAddress(), permittedLists.ERC20],
    libraries: {
      NFTfiSigningUtils: nftfiSigningUtils.address,
      LoanChecksAndCalculations: loanChecksAndCalculations.address,
      ContractKeys: contractKeysAddress,
      ContractKeyUtils: await contractKeyUtils.getAddress(),
    },
    log: true,
  });

  console.log(
    'CollectionOfferLoan deployed byte size: ',
    (collectionOfferDeploymentData.deployedBytecode || '').length / 2,
  );

  await deploy('NFTfiSigningUtilsContract', {
    from: deployer,
    args: [],
    libraries: {
      NFTfiSigningUtils: nftfiSigningUtils.address,
    },
    log: true,
  });

  await deploy('NFTfiCollectionOfferSigningUtilsContract', {
    from: deployer,
    args: [],
    log: true,
  });
};

export default func;

func.tags = ['LoanTypes'];
