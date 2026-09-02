import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Refinancing } from '../typechain';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();
  await deploy('ArcadeRefinancingAdapter', {
    from: deployer,
    log: true,
  });

  const arcadeRefinancingAdapter = await ethers.getContract('ArcadeRefinancingAdapter');
  const refinancing = (await ethers.getContract('Refinancing')) as Refinancing;

  const arcadeRefinancingAdapterType = 'ARCADEV3';
  const arcadeLoanCore = '0x89bc08BA00f135d608bc335f6B33D7a9ABCC98aF';

  if ((await refinancing.owner()) === deployer) {
    console.log('Refinancing still owned, setting up arcade refi adapter...');
    await refinancing.setRefinanceableType(arcadeRefinancingAdapterType, await arcadeRefinancingAdapter.getAddress());
    await refinancing.setRefinanceableContract(arcadeLoanCore, arcadeRefinancingAdapterType);
  } else {
    console.log('Refinancing not owned, arcade refi adapter has to be set up manually!');
  }
};

export default func;

func.tags = ['ArcadeRefinancingAdapter'];
