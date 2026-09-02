import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { getOwnerAddress } from './utils/owner-address';
import { NftfiHub } from '../typechain';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, ethers, getNamedAccounts, network } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const nftfiHub = (await ethers.getContract('NftfiHub')) as NftfiHub;
  const contractKeys = await ethers.getContract('ContractKeys');

  const personalEscrow = await deploy('PersonalEscrow', {
    from: deployer,
    args: [await nftfiHub.getAddress()],
    log: true,
    libraries: {
      ContractKeys: await contractKeys.getAddress(),
    },
  });

  await deploy('PersonalEscrowFactory', {
    from: deployer,
    args: [personalEscrow.address, getOwnerAddress(network.name.toLowerCase(), deployer)],
    log: true,
  });
};

export default func;

func.tags = ['PersonalEscrow'];
