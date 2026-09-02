import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { getOwnerAddress } from './utils/owner-address';
import { NftfiHub } from '../typechain';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, ethers, getNamedAccounts, network } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const admin = await getOwnerAddress(network.name.toLowerCase(), deployer);

  const nftfiHub = (await ethers.getContract('NftfiHub')) as NftfiHub;
  const contractKeyUtils = await ethers.getContract('ContractKeyUtils');

  // the same address for all networks
  // https://etherscan.io/address/0x00000000000000447e69651d841bd8d104bed493#code
  const delegateCashAddress = '0x00000000000000447e69651d841bd8d104bed493';

  await deploy('DelegateCashPlugin', {
    from: deployer,
    args: [delegateCashAddress, await nftfiHub.getAddress(), admin],
    log: true,
    libraries: {
      ContractKeyUtils: await contractKeyUtils.getAddress(),
    },
  });
};

export default func;

func.tags = ['DelegateCashPlugin'];
